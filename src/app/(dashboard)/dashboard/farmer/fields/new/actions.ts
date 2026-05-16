"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface CreateFieldInput {
  name:        string;
  type:        "GREENHOUSE" | "OPEN_FIELD" | "ORCHARD";
  areaHectares?: number;
  locationLat?:  number;
  locationLng?:  number;
  cropName?:     string;
  plantCount?:   number;
}

export async function createFieldAction(
  input: CreateFieldInput
): Promise<{ fieldId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const userId = session.user.id;

  if (!input.name.trim()) return { error: "Sera adı zorunludur." };

  try {
    const field = await prisma.field.create({
      data: {
        name:         input.name.trim(),
        type:         input.type,
        areaHectares: input.areaHectares ?? null,
        locationLat:  input.locationLat  ?? null,
        locationLng:  input.locationLng  ?? null,
        userId,
      },
    });

    if (input.cropName?.trim()) {
      await prisma.crop.create({
        data: {
          name:       input.cropName.trim(),
          fieldId:    field.id,
          growthStage: "SEEDLING",
          plantCount:  input.plantCount ?? null,
        },
      });
    }

    return { fieldId: field.id };
  } catch {
    return { error: "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin." };
  }
}
