import { prisma } from "./prisma";
import { runFunctionalComparison, TestResult } from "./testRunner";
import { runVisualComparison } from "./visualTestRunner";
import { generateAiTestCases } from "./ai";

// Hard ceiling on total run time. If Playwright hangs (e.g. a browser
// launch that never resolves or rejects, rather than erroring cleanly —
// this can happen if the browser binary is missing/corrupted or blocked
// by antivirus/firewall on some machines), nothing else in this file
// would ever catch it, since a hung promise never reaches the catch
// block. This wraps the whole run in a race against a timeout so it
// always resolves to COMPLETED or FAILED — never stuck at RUNNING.
const MAX_RUN_DURATION_MS = 120_000; // 2 minutes

/**
 * Runs the full test suite for a run that already exists in the DB
 * (status PENDING) and writes results back when done. Designed to be
 * called WITHOUT awaiting from the API route — see app/api/runs/route.ts.
 *
 * This relies on the Node process staying alive after the HTTP response
 * is sent, which is true for `next dev` and `next start` (a persistent
 * server — e.g. Render's free web service) but NOT guaranteed on Vercel's
 * serverless functions, which can freeze shortly after responding. If you
 * deploy there, this needs to move to a real queue (BullMQ + Upstash) or
 * a dispatched GitHub Actions workflow instead — see the dev plan.
 */
export async function executeRun(
  runId: string,
  sourceAUrl: string,
  sourceBUrl: string,
  includeUi: boolean
): Promise<void> {
  const startedAt = Date.now();

  await prisma.run.update({ where: { id: runId }, data: { status: "RUNNING" } });

  try {
    await Promise.race([
      runSuite(runId, sourceAUrl, sourceBUrl, includeUi, startedAt),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Run exceeded ${MAX_RUN_DURATION_MS / 1000}s timeout`)),
          MAX_RUN_DURATION_MS
        )
      ),
    ]);
  } catch (err) {
    console.error(`Run ${runId} failed:`, err);
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}

async function runSuite(
  runId: string,
  sourceAUrl: string,
  sourceBUrl: string,
  includeUi: boolean,
  startedAt: number
): Promise<void> {
  const [{ results: functionalResults, pageASummary, pageBSummary }, visualResults] =
    await Promise.all([
      runFunctionalComparison(sourceAUrl, sourceBUrl),
      includeUi ? runVisualComparison(runId, sourceAUrl, sourceBUrl) : Promise.resolve([]),
    ]);

  // AI-assisted extra test cases — one call per run to control cost.
  // Failure here should never fail the whole run: rule-based results
  // already stand on their own.
  let aiCases: Awaited<ReturnType<typeof generateAiTestCases>> = [];
  try {
    aiCases = await generateAiTestCases(pageASummary, pageBSummary);
  } catch (err) {
    console.error("AI test case generation failed (non-fatal):", err);
  }

  const allResults: TestResult[] = [
    ...functionalResults,
    ...visualResults,
    ...aiCases.map((c) => ({
      category: c.category,
      title: c.title,
      expectedResult: c.expectedResult,
      actualResult: "Needs manual review (AI-suggested case)",
      status: "FAIL" as const, // surfaced for a human to check, not auto-verdict
      durationMs: 0,
    })),
  ];

  const passCount = allResults.filter((r) => r.status === "PASS").length;
  const successRate = allResults.length > 0 ? (passCount / allResults.length) * 100 : 0;
  const totalDuration = Date.now() - startedAt;

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: "COMPLETED",
      successRate,
      totalDuration,
      completedAt: new Date(),
      testCases: {
        create: allResults.map((r) => ({
          category: r.category,
          title: r.title,
          expectedResult: r.expectedResult,
          actualResult: r.actualResult,
          status: r.status,
          durationMs: r.durationMs,
          errorDetail: r.errorDetail,
          viewport: r.viewport,
          screenshotAUrl: r.screenshotAUrl,
          screenshotBUrl: r.screenshotBUrl,
          diffImageUrl: r.diffImageUrl,
          diffPercent: r.diffPercent,
        })),
      },
    },
  });
}
