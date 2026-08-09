"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunForm() {
  const router = useRouter();
  const [sourceAUrl, setSourceAUrl] = useState("");
  const [sourceBUrl, setSourceBUrl] = useState("");
  const [includeUi, setIncludeUi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAUrl, sourceBUrl, includeUi }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.formErrors?.[0] ?? data.detail ?? "Run failed to complete.");
        setLoading(false);
        return;
      }

      router.push(`/runs/${data.id}`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="sourceA" className="block text-[13px] font-medium text-ink-dim mb-1.5">
            Source A <span className="text-ink-dim/70">— reference</span>
          </label>
          <input
            id="sourceA"
            type="url"
            required
            placeholder="https://staging.example.com"
            value={sourceAUrl}
            onChange={(e) => setSourceAUrl(e.target.value)}
            className="w-full rounded-md border border-line bg-workspace px-3 py-2.5 text-[14px] font-mono text-ink placeholder:text-ink-dim/50 outline-none focus-visible:border-signal"
          />
        </div>
        <div>
          <label htmlFor="sourceB" className="block text-[13px] font-medium text-ink-dim mb-1.5">
            Source B <span className="text-ink-dim/70">— target / dev</span>
          </label>
          <input
            id="sourceB"
            type="url"
            required
            placeholder="https://dev.example.com"
            value={sourceBUrl}
            onChange={(e) => setSourceBUrl(e.target.value)}
            className="w-full rounded-md border border-line bg-workspace px-3 py-2.5 text-[14px] font-mono text-ink placeholder:text-ink-dim/50 outline-none focus-visible:border-signal"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-[13px] text-fail bg-fail-bg rounded-md px-3 py-2">{error}</p>
      )}

      <label className="mt-5 flex items-center gap-2 text-[13px] text-ink-dim cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={includeUi}
          onChange={(e) => setIncludeUi(e.target.checked)}
          className="h-3.5 w-3.5 accent-signal"
        />
        Include visual/UI testing (screenshots at 3 viewports, pixel diff — adds ~20–30s)
      </label>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12.5px] text-ink-dim">
          Functional: load status, console errors, broken links, structural parity.
          {includeUi && " UI: pixel-diff comparison at desktop, tablet, and mobile."}
        </p>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-signal px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Starting run…" : "Run comparison"}
        </button>
      </div>
    </form>
  );
}
