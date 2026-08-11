import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await prisma.run.findUnique({ where: { id } });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Only allow cancellation if run is PENDING or RUNNING
    if (run.status !== "PENDING" && run.status !== "RUNNING") {
      return NextResponse.json(
        { error: `Cannot cancel a run with status: ${run.status}` },
        { status: 400 }
      );
    }

    // Set the cancelled flag and update status to CANCELLED
    const updatedRun = await prisma.run.update({
      where: { id },
      data: {
        cancelled: true,
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updatedRun);
  } catch (err) {
    console.error("Error cancelling run:", err);
    return NextResponse.json(
      { error: "Failed to cancel run" },
      { status: 500 }
    );
  }
}
