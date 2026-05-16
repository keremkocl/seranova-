"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function ensureConsultant() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Oturum bulunamadı.");
  if (session.user.role !== "CONSULTANT" && session.user.role !== "ADMIN") {
    throw new Error("Yetkiniz yok.");
  }
  return session.user.id;
}

export async function approveRecommendation(
  id: string,
  note?: string
): Promise<{ error?: string }> {
  try {
    const consultantId = await ensureConsultant();
    await prisma.$transaction([
      prisma.recommendation.update({
        where: { id },
        data: { status: "APPROVED", consultantNote: note ?? null },
      }),
      prisma.consultantReview.create({
        data: { recommendationId: id, consultantId, comment: note ?? null, approved: true },
      }),
    ]);
    revalidatePath("/dashboard/consultant/reports");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bir hata oluştu." };
  }
}

export async function rejectRecommendation(
  id: string,
  note: string
): Promise<{ error?: string }> {
  try {
    const consultantId = await ensureConsultant();
    await prisma.$transaction([
      prisma.recommendation.update({
        where: { id },
        data: { status: "REJECTED", consultantNote: note },
      }),
      prisma.consultantReview.create({
        data: { recommendationId: id, consultantId, comment: note, approved: false },
      }),
    ]);
    revalidatePath("/dashboard/consultant/reports");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bir hata oluştu." };
  }
}

export async function reviseRecommendation(
  id: string,
  note: string
): Promise<{ error?: string }> {
  try {
    const consultantId = await ensureConsultant();
    await prisma.$transaction([
      prisma.recommendation.update({
        where: { id },
        data: { status: "REVISED", consultantNote: note },
      }),
      prisma.consultantReview.create({
        data: { recommendationId: id, consultantId, comment: note, approved: false },
      }),
    ]);
    revalidatePath("/dashboard/consultant/reports");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bir hata oluştu." };
  }
}
