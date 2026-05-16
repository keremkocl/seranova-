"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitRecommendationAction(
  id: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const rec = await prisma.recommendation.findFirst({
    where: { id, farmerId: session.user.id, status: "DRAFT" },
  });
  if (!rec) return { error: "Öneri bulunamadı veya gönderilemez durumda." };

  await prisma.recommendation.update({
    where: { id },
    data:  { status: "SUBMITTED" },
  });

  revalidatePath(`/dashboard/farmer/recommendations/${id}`);
  return {};
}
