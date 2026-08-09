interface Props {
  passCount: number;
  failCount: number;
  successRate: number;
  totalDuration: number;
}

export function SummaryBar({ passCount, failCount, successRate, totalDuration }: Props) {
  const total = passCount + failCount;
  const passPct = total > 0 ? (passCount / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <Stat label="Success rate" value={`${successRate.toFixed(0)}%`} accent />
        <Stat label="Passed" value={String(passCount)} />
        <Stat label="Failed" value={String(failCount)} />
        <Stat label="Duration" value={`${(totalDuration / 1000).toFixed(1)}s`} />
      </div>

      {/* signal strip — segmented pass/fail bar, the page's signature element */}
      <div className="mt-5 h-2 w-full rounded-full overflow-hidden bg-fail-bg flex">
        <div className="h-full bg-pass" style={{ width: `${passPct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-ink-dim mb-1">{label}</p>
      <p className={`font-display text-2xl font-semibold ${accent ? "text-signal" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
