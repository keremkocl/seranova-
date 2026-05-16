"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteFieldAction(
  fieldId: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const userId = session.user.id;

  const field = await prisma.field.findFirst({
    where: { id: fieldId, userId },
    select: { id: true },
  });

  if (!field) return { error: "Sera bulunamadı veya bu işlem için yetkiniz yok." };

  try {
    await prisma.field.delete({ where: { id: fieldId } });
    revalidatePath("/dashboard/farmer/fields");
    return { success: true };
  } catch {
    return { error: "Sera silinirken bir hata oluştu. Lütfen tekrar deneyin." };
  }
}
