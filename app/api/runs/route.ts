import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { executeRun } from "@/lib/executeRun";

const createRunSchema = z.object({
  sourceAUrl: z.string().url(),
  sourceBUrl: z.string().url(),
  includeUi: z.boolean().optional().default(true),
});

// This route now returns almost immediately (just a DB insert) and kicks
// off the actual test run in the background — see lib/executeRun.ts for
// why that's safe here and where it stops being safe (Vercel serverless).
// The frontend polls GET /api/runs/[id] until status is COMPLETED/FAILED.

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createRunSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sourceAUrl, sourceBUrl, includeUi } = parsed.data;

  const run = await prisma.run.create({
    data: { sourceAUrl, sourceBUrl, status: "PENDING" },
  });

  // Fire-and-forget: intentionally not awaited. Errors are caught and
  // written to the DB inside executeRun itself, so this never produces
  // an unhandled rejection.
  void executeRun(run.id, sourceAUrl, sourceBUrl, includeUi);

  return NextResponse.json(run, { status: 201 });
}

export async function GET() {
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(runs);
}
