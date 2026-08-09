import { prisma } from "@/lib/prisma";
import { RunForm } from "@/components/RunForm";
import { RunHistory } from "@/components/RunHistory";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[12.5px] font-mono uppercase tracking-wider text-signal mb-2">
          URL vs URL — Functional
        </p>
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink mb-2">
          Compare two URLs
        </h1>
        <p className="text-[14px] text-ink-dim max-w-xl">
          Paste a reference URL and a target URL. We&apos;ll load both, run a
          functional test suite, and generate a pass/fail report with
          expected vs. actual results.
        </p>
      </div>

      <RunForm />

      <div id="history">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[16px] font-semibold text-ink">Recent runs</h2>
          <a href="/history" className="text-[13px] text-signal hover:underline">
            View full history & trends →
          </a>
        </div>
        <RunHistory
          runs={runs.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
