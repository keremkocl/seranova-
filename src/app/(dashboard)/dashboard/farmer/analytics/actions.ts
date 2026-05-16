"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAutomationNotification } from "@/lib/notification-engine";

export type DeviceName = "irrigationOn" | "ventilationOn" | "lightingOn";

const DEVICE_LABELS: Record<DeviceName, string> = {
  irrigationOn:  "Sulama sistemi",
  ventilationOn: "Havalandırma",
  lightingOn:    "Yapay aydınlatma",
};

async function ensureFieldOwner(fieldId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Oturum bulunamadı.");
  const field = await prisma.field.findFirst({
    where: { id: fieldId, userId: session.user.id },
  });
  if (!field) throw new Error("Alan bulunamadı.");
  return { field, userId: session.user.id };
}

export async function toggleDeviceAction(
  fieldId: string,
  device: DeviceName,
  value: boolean
): Promise<{ error?: string }> {
  try {
    const { field, userId } = await ensureFieldOwner(fieldId);
    if (field.automationMode !== "MANUAL") {
      return { error: "Manuel mod aktif değil. Önce moda geçin." };
    }
    await prisma.$transaction([
      prisma.field.update({
        where: { id: fieldId },
        data: { [device]: value },
      }),
      prisma.automationEvent.create({
        data: {
          fieldId,
          type:     `MANUAL_${device.toUpperCase()}_${value ? "ON" : "OFF"}`,
          message:  `${DEVICE_LABELS[device]} manuel olarak ${value ? "açıldı" : "kapatıldı"}.`,
          severity: "INFO",
        },
      }),
    ]);
    await createAutomationNotification({
      userId,
      fieldId,
      title:    `${DEVICE_LABELS[device]} ${value ? "açıldı" : "kapatıldı"}`,
      message:  `${field.name} · Manuel kontrol kullanıldı.`,
      severity: "INFO",
      source:   "USER_ACTION",
    });
    revalidatePath("/dashboard/farmer/analytics");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bir hata oluştu." };
  }
}

export async function setAutomationModeAction(
  fieldId: string,
  mode: "AUTO" | "MANUAL"
): Promise<{ error?: string }> {
  try {
    const { field, userId } = await ensureFieldOwner(fieldId);
    await prisma.$transaction([
      prisma.field.update({
        where: { id: fieldId },
        data: { automationMode: mode },
      }),
      prisma.automationEvent.create({
        data: {
          fieldId,
          type:     `MODE_CHANGED_TO_${mode}`,
          message:  mode === "AUTO"
            ? "Otomasyon modu etkinleştirildi. AI kontrol devralındı."
            : "Manuel mod etkinleştirildi. Cihazlar kullanıcı kontrolünde.",
          severity: "INFO",
        },
      }),
    ]);
    await createAutomationNotification({
      userId,
      fieldId,
      title:    mode === "AUTO" ? "AI otomasyonu etkinleştirildi" : "Manuel mod etkinleştirildi",
      message:  `${field.name} · ${mode === "AUTO" ? "Cihazlar AI kontrolüne geçti." : "Cihazlar kullanıcı kontrolüne geçti."}`,
      severity: "INFO",
      source:   "USER_ACTION",
    });
    revalidatePath("/dashboard/farmer/analytics");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bir hata oluştu." };
  }
}
