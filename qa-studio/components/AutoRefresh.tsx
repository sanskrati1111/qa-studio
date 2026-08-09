"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While a run is still PENDING/RUNNING, refetches the (server-rendered)
 * report page every 2s so the status/results appear without a manual
 * reload. Renders nothing — it's a polling side effect only.
 */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
}
