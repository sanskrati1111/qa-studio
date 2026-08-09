import { StatusBadge } from "./StatusBadge";
import { DiffViewer } from "./DiffViewer";

interface TestCase {
  id: string;
  category: string; // "FUNCTIONAL" | "UI" — plain string (see schema.prisma note on SQLite + enums)
  title: string;
  expectedResult: string;
  actualResult: string;
  status: string; // "PASS" | "FAIL"
  durationMs: number;
  errorDetail?: string | null;
  viewport?: string | null;
  screenshotAUrl?: string | null;
  screenshotBUrl?: string | null;
  diffImageUrl?: string | null;
  diffPercent?: number | null;
}

export function TestCaseTable({ testCases }: { testCases: TestCase[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <table className="w-full text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-[11.5px] uppercase tracking-wide text-ink-dim">
            <th className="w-1.5" />
            <th className="py-3 pl-2 pr-4 font-medium">Test case</th>
            <th className="py-3 px-4 font-medium">Expected</th>
            <th className="py-3 px-4 font-medium">Actual</th>
            <th className="py-3 px-4 font-medium">Duration</th>
            <th className="py-3 pl-4 pr-5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc) => (
            <tr key={tc.id} className="border-b border-line last:border-0 align-top group">
              <td className={`w-1.5 ${tc.status === "PASS" ? "bg-pass" : "bg-fail"}`} />
              <td className="py-3.5 pl-2 pr-4">
                <p className="font-medium text-ink">{tc.title}</p>
                <p className="mt-0.5 text-[11.5px] font-mono uppercase tracking-wide text-ink-dim">
                  {tc.category}
                </p>
                {tc.errorDetail && (
                  <p className="mt-1.5 text-[12px] font-mono text-fail bg-fail-bg rounded px-2 py-1 max-w-md whitespace-pre-wrap">
                    {tc.errorDetail}
                  </p>
                )}
                {tc.category === "UI" &&
                  tc.screenshotAUrl &&
                  tc.screenshotBUrl &&
                  tc.diffImageUrl &&
                  tc.diffPercent != null && (
                    <DiffViewer
                      screenshotAUrl={tc.screenshotAUrl}
                      screenshotBUrl={tc.screenshotBUrl}
                      diffImageUrl={tc.diffImageUrl}
                      diffPercent={tc.diffPercent}
                    />
                  )}
              </td>
              <td className="py-3.5 px-4 text-ink-dim font-mono text-[12.5px] max-w-[220px]">
                {tc.expectedResult}
              </td>
              <td className="py-3.5 px-4 font-mono text-[12.5px] max-w-[220px] text-ink">
                {tc.actualResult}
              </td>
              <td className="py-3.5 px-4 font-mono text-[12.5px] text-ink-dim whitespace-nowrap">
                {tc.durationMs > 0 ? `${tc.durationMs}ms` : "—"}
              </td>
              <td className="py-3.5 pl-4 pr-5">
                <StatusBadge status={tc.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
