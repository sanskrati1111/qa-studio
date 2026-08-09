"use client";

import { useEffect, useState } from "react";

export function RunInProgress({ startedAt }: { startedAt: string }) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = () => setElapsedSec(Math.floor((Date.now() - started) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="rounded-lg border border-line bg-surface p-8 flex flex-col items-center text-center">
      <div className="h-8 w-8 rounded-full border-2 border-running/30 border-t-running animate-spin" />
      <p className="mt-4 font-display text-[16px] font-semibold text-ink">Running tests…</p>
      <p className="mt-1 text-[13px] text-ink-dim font-mono">
        {elapsedSec}s elapsed · typically 5–40s depending on options
      </p>
    </div>
  );
}
