"use client";

import { useState } from "react";

interface Props {
  screenshotAUrl: string;
  screenshotBUrl: string;
  diffImageUrl: string;
  diffPercent: number;
}

export function DiffViewer({ screenshotAUrl, screenshotBUrl, diffImageUrl, diffPercent }: Props) {
  const [sliderPos, setSliderPos] = useState(50);
  const [showDiffOverlay, setShowDiffOverlay] = useState(false);

  return (
    <div className="mt-3 rounded-md border border-line overflow-hidden bg-workspace max-w-md">
      <div className="relative w-full aspect-[16/10] bg-line/40 select-none">
        {/* Source A — base layer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotAUrl}
          alt="Source A screenshot"
          className="absolute inset-0 h-full w-full object-cover object-top"
          draggable={false}
        />
        {/* Source B (or diff overlay) — clipped by slider */}
        <div
          className="absolute inset-0 h-full overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showDiffOverlay ? diffImageUrl : screenshotBUrl}
            alt={showDiffOverlay ? "Pixel diff overlay" : "Source B screenshot"}
            className="h-full object-cover object-top"
            style={{ width: `${(100 / Math.max(sliderPos, 1)) * 100}%`, maxWidth: "none" }}
            draggable={false}
          />
        </div>
        {/* Slider handle line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-signal"
          style={{ left: `${sliderPos}%` }}
        />
      </div>

      <div className="p-3 space-y-2.5 bg-surface">
        <input
          type="range"
          min={0}
          max={100}
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="w-full accent-signal"
          aria-label="Slide to compare Source A and Source B"
        />
        <div className="flex items-center justify-between text-[11.5px] font-mono text-ink-dim">
          <span>← Source A</span>
          <button
            type="button"
            onClick={() => setShowDiffOverlay((v) => !v)}
            className="text-signal hover:underline"
          >
            {showDiffOverlay ? "Show Source B" : `Show diff overlay (${diffPercent.toFixed(1)}%)`}
          </button>
          <span>Source B →</span>
        </div>
      </div>
    </div>
  );
}
