"use client";

interface ExportCsvButtonProps {
  runId: string;
}

export function ExportCsvButton({ runId }: ExportCsvButtonProps) {
  return (
    <a
      href={`/api/runs/${runId}/export`}
      download
      className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-dim hover:text-ink hover:border-ink-dim transition-colors"
    >
      Export CSV
    </a>
  );
}
