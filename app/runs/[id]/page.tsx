import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SummaryBar } from "@/components/SummaryBar";
import { TestCaseTable } from "@/components/TestCaseTable";
import { StatusBadge } from "@/components/StatusBadge";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RunInProgress } from "@/components/RunInProgress";
import { CancelButton } from "@/components/CancelButton";

export const dynamic = "force-dynamic";

export default async function RunReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const run = await prisma.run.findUnique({
    where: { id },
    include: { testCases: { orderBy: { createdAt: "asc" } } },
  });

  if (!run) notFound();

  const passCount = run.testCases.filter((t) => t.status === "PASS").length;
  const failCount = run.testCases.filter((t) => t.status === "FAIL").length;

  const isInProgress = run.status === "PENDING" || run.status === "RUNNING";

  return (
    <div className="space-y-8">
      <AutoRefresh active={isInProgress} />
      <div>
        <Link href="/" className="text-[13px] text-ink-dim hover:text-ink transition-colors">
          ← New run
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-semibold text-ink truncate">
              <span className="font-mono text-[16px]">{run.sourceAUrl}</span>
              <span className="text-ink-dim mx-2">vs</span>
              <span className="font-mono text-[16px]">{run.sourceBUrl}</span>
            </h1>
            <p className="mt-1 text-[13px] text-ink-dim">
              Started {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {run.status === "COMPLETED" && (
              <a
                href={`/api/runs/${run.id}/export`}
                download
                className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-dim hover:text-ink hover:border-ink-dim transition-colors"
              >
                Export CSV
              </a>
            )}
            {(run.status === "RUNNING" || run.status === "PENDING") && (
              <CancelButton runId={run.id} />
            )}
            <StatusBadge
              status={run.status === "COMPLETED" ? "PASS" : run.status === "FAILED" ? "FAIL" : run.status === "CANCELLED" ? "CANCELLED" : "RUNNING"}
            />
          </div>
        </div>
      </div>

      {isInProgress && <RunInProgress startedAt={run.createdAt.toISOString()} />}

      {run.status === "FAILED" && (
        <div className="rounded-lg border border-fail/30 bg-fail-bg px-5 py-4">
          <p className="text-[13.5px] font-medium text-fail">Run failed to complete</p>
          <p className="mt-1 text-[13px] text-fail/80 font-mono">{run.errorMessage}</p>
        </div>
      )}

      {run.status === "CANCELLED" && (
        <div className="rounded-lg border border-warn/30 bg-warn-bg px-5 py-4">
          <p className="text-[13.5px] font-medium text-warn">Run was cancelled</p>
        </div>
      )}

      {run.status === "COMPLETED" && (
        <>
          <SummaryBar
            passCount={passCount}
            failCount={failCount}
            successRate={run.successRate ?? 0}
            totalDuration={run.totalDuration ?? 0}
          />
          <TestCaseTable testCases={run.testCases} />
        </>
      )}
    </div>
  );
}
