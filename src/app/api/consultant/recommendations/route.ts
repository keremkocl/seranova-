import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "CONSULTANT" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recs = await prisma.recommendation.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
    include: {
      farmer: { select: { name: true, email: true } },
      field:  { select: { name: true } },
      crop:   { select: { name: true, growthStage: true } },
    },
  });

  return NextResponse.json(
    recs.map((r: (typeof recs)[number]) => ({
      id:              r.id,
      title:           r.title,
      status:          r.status,
      createdAt:       r.createdAt.toISOString(),
      farmer:          r.farmer,
      field:           r.field,
      crop:            r.crop,
      content:         r.content,
      consultantNote:  r.consultantNote,
      confidenceScore: r.confidenceScore,
      estimatedCost:   r.estimatedCost,
      riskSummary:     r.riskSummary,
    }))
  );
}
