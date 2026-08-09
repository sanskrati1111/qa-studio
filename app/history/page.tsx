import { prisma } from "@/lib/prisma";
import { TrendChart } from "@/components/TrendChart";
import { RunHistory } from "@/components/RunHistory";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const completedRuns = runs.filter((r) => r.status === "COMPLETED" && r.successRate != null);

  // Chart reads oldest → newest left to right; runs are fetched newest first.
  const trendData = [...completedRuns].reverse().map((r) => ({
    label: new Date(r.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    successRate: r.successRate ?? 0,
    url: r.sourceBUrl,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink mb-1">
          Run history
        </h1>
        <p className="text-[14px] text-ink-dim">
          Success rate trend and full log across every comparison you&apos;ve run.
        </p>
      </div>

      <TrendChart data={trendData} />

      <div>
        <h2 className="font-display text-[16px] font-semibold text-ink mb-3">All runs</h2>
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
