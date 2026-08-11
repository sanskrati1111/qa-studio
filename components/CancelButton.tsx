"use client";

import { useState } from "react";

interface CancelButtonProps {
  runId: string;
  onCancel?: () => void;
}

export function CancelButton({ runId, onCancel }: CancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel run");
      }

      onCancel?.();
      // Optionally reload the page to see the updated status
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className="rounded-md border border-fail px-3 py-1.5 text-[12.5px] font-medium text-fail hover:bg-fail/10 hover:border-fail transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Cancelling..." : "Cancel Test"}
      </button>
      {error && <p className="text-[12px] text-fail">{error}</p>}
    </div>
  );
}
