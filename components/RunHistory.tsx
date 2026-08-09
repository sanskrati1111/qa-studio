import Link from "next/link";
import { StatusBadge } from "./StatusBadge";

interface Run {
  id: string;
  sourceAUrl: string;
  sourceBUrl: string;
  status: string; // "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" — plain string (see schema.prisma note on SQLite + enums)
  successRate: number | null;
  createdAt: string;
}

export function RunHistory({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
        <p className="text-[13.5px] text-ink-dim">
          No runs yet. Paste two URLs above and run your first comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface divide-y divide-line">
      {runs.map((run) => (
        <Link
          key={run.id}
          href={`/runs/${run.id}`}
          className="flex items-center justify-between px-5 py-4 hover:bg-workspace/60 transition-colors"
        >
          <div className="min-w-0">
            <p className="font-mono text-[13px] text-ink truncate">
              {run.sourceAUrl} <span className="text-ink-dim">vs</span> {run.sourceBUrl}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-dim">
              {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 pl-4">
            {run.successRate !== null && (
              <span className="font-display text-[14px] font-semibold text-ink">
                {run.successRate.toFixed(0)}%
              </span>
            )}
            <StatusBadge
              status={run.status === "COMPLETED" ? "PASS" : run.status === "FAILED" ? "FAIL" : "RUNNING"}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
