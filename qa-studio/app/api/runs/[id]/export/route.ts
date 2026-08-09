import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Escapes a value for CSV: wraps in quotes and doubles any internal
// quotes if the value contains a comma, quote, or newline.
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const run = await prisma.run.findUnique({
    where: { id },
    include: { testCases: { orderBy: { createdAt: "asc" } } },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const headers = [
    "Category",
    "Test Case",
    "Expected Result",
    "Actual Result",
    "Status",
    "Duration (ms)",
    "Viewport",
    "Diff %",
  ];

  const rows = run.testCases.map((tc) => [
    tc.category,
    tc.title,
    tc.expectedResult,
    tc.actualResult,
    tc.status,
    String(tc.durationMs),
    tc.viewport ?? "",
    tc.diffPercent != null ? tc.diffPercent.toFixed(1) : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const filename = `qa-run-${run.id}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
