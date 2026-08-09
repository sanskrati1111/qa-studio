type Status = "PASS" | "FAIL" | "RUNNING" | "PENDING";

const config: Record<Status, { label: string; text: string; bg: string; dot: string }> = {
  PASS: { label: "Pass", text: "text-pass", bg: "bg-pass-bg", dot: "bg-pass" },
  FAIL: { label: "Fail", text: "text-fail", bg: "bg-fail-bg", dot: "bg-fail" },
  RUNNING: { label: "Running", text: "text-running", bg: "bg-running-bg", dot: "bg-running" },
  PENDING: { label: "Pending", text: "text-ink-dim", bg: "bg-workspace", dot: "bg-ink-dim" },
};

// Accepts a plain string (Prisma returns status/category as `string`,
// not a generated enum, since SQLite doesn't support native enums —
// see prisma/schema.prisma). Falls back to PENDING styling for any
// unrecognized value so this never crashes on unexpected data.
export function StatusBadge({ status }: { status: string }) {
  const c = config[status as Status] ?? config.PENDING;
  const label = (status as Status) in config ? config[status as Status].label : status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium font-mono ${c.text} ${c.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label.toUpperCase()}
    </span>
  );
}
