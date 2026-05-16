"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationReadAction(id: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data:  { isRead: true },
  });
  revalidatePath("/dashboard/farmer/notifications");
  revalidatePath("/dashboard/farmer");
  return {};
}

export async function markAllNotificationsReadAction(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data:  { isRead: true },
  });
  revalidatePath("/dashboard/farmer/notifications");
  revalidatePath("/dashboard/farmer");
  return {};
}
