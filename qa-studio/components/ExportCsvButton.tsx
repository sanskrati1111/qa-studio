"use client";

import { useState } from "react";

export function ExportCsvButton({ runId }: { runId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/runs/${runId}/export`);

      if (!res.ok) {
        const text = await res.text();
        setError(`Export failed (${res.status}): ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qa-run-${runId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed — couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-dim hover:text-ink hover:border-ink-dim transition-colors disabled:opacity-50"
      >
        {loading ? "Exporting…" : "Export CSV"}
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-2 w-64 text-[12px] font-mono text-fail bg-fail-bg rounded px-2 py-1.5 z-10">
          {error}
        </p>
      )}
    </div>
  );
}
