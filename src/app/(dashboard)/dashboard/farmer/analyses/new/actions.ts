"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateRecommendation,
  generateTitle,
  type EngineInput,
  type GrowthStage,
} from "@/lib/recommendation-engine";
import { runFertigation } from "@/lib/fertigation-engine";
import { createRecommendationNotification } from "@/lib/notification-engine";

export interface AnalysisInput {
  fieldId: string;
  cropId?: string;
  soilPh: number;
  soilEc: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
  waterPh?: number;
  waterEc?: number;
  notes?: string;
}

export async function createAnalysisAction(
  input: AnalysisInput
): Promise<{ recommendationId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const userId = session.user.id;

  const field = await prisma.field.findFirst({
    where: { id: input.fieldId, userId },
  });
  if (!field) return { error: "Seçili alan bulunamadı veya yetkiniz yok." };

  let crop: { id: string; name: string; growthStage: GrowthStage; plantCount: number | null } | null = null;
  if (input.cropId) {
    const found = await prisma.crop.findFirst({
      where: { id: input.cropId, fieldId: input.fieldId },
      select: { id: true, name: true, growthStage: true, plantCount: true },
    });
    if (!found) return { error: "Seçili ürün bu alana ait değil." };
    crop = { ...found, growthStage: found.growthStage as GrowthStage };
  }

  const now = new Date();

  // Fetch latest sensor + weather readings for fertigation context (outside tx)
  const [latestSensor, latestWeather] = await Promise.all([
    prisma.sensorReading.findFirst({ where: { field: { id: input.fieldId, userId } }, orderBy: { createdAt: "desc" } }),
    prisma.weatherReading.findFirst({ where: { field: { id: input.fieldId, userId } }, orderBy: { createdAt: "desc" } }),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    const soilAnalysis = await tx.soilAnalysis.create({
      data: {
        fieldId:       input.fieldId,
        cropId:        input.cropId ?? null,
        status:        "SUBMITTED",
        ph:            input.soilPh,
        ec:            input.soilEc,
        nitrogen:      input.nitrogen,
        phosphorus:    input.phosphorus,
        potassium:     input.potassium,
        organicMatter: input.organicMatter,
        notes:         input.notes ?? null,
        analyzedAt:    now,
      },
    });

    let waterAnalysisId: string | null = null;
    if (input.waterPh != null || input.waterEc != null) {
      const wa = await tx.waterAnalysis.create({
        data: {
          fieldId:    input.fieldId,
          status:     "SUBMITTED",
          ph:         input.waterPh  ?? null,
          ec:         input.waterEc  ?? null,
          notes:      input.notes    ?? null,
          analyzedAt: now,
        },
      });
      waterAnalysisId = wa.id;
    }

    const cropName    = crop?.name       ?? "Genel Bitki";
    const growthStage = crop?.growthStage ?? "VEGETATIVE";
    const waterInput  = (input.waterPh != null || input.waterEc != null)
      ? { ph: input.waterPh ?? null, ec: input.waterEc ?? null }
      : null;

    const engineInput: EngineInput = {
      cropName,
      growthStage,
      soil: {
        ph:            input.soilPh,
        ec:            input.soilEc,
        nitrogen:      input.nitrogen,
        phosphorus:    input.phosphorus,
        potassium:     input.potassium,
        organicMatter: input.organicMatter,
      },
      water: waterInput,
    };

    const fert = runFertigation({
      cropName,
      growthStage,
      soil: {
        ph:            input.soilPh,
        ec:            input.soilEc,
        nitrogen:      input.nitrogen,
        phosphorus:    input.phosphorus,
        potassium:     input.potassium,
        organicMatter: input.organicMatter,
      },
      water: waterInput,
      sensor: latestSensor
        ? { soilMoisture: latestSensor.soilMoisture, temperature: latestSensor.temperature }
        : null,
      weather: latestWeather
        ? { outsideTemperature: latestWeather.outsideTemperature, rainChance: latestWeather.rainChance }
        : null,
      plantCount: crop?.plantCount ?? null,
    });

    const content = generateRecommendation(engineInput);
    const title   = generateTitle(cropName, growthStage);

    const rec = await tx.recommendation.create({
      data: {
        title,
        content:                 JSON.stringify(content),
        status:                  "DRAFT",
        farmerId:                userId,
        fieldId:                 input.fieldId,
        cropId:                  input.cropId ?? null,
        soilAnalysisId:          soilAnalysis.id,
        waterAnalysisId,
        targetPh:                fert.targetPh,
        targetEc:                fert.targetEc,
        irrigationLitersPerPlant: fert.irrigationLitersPerPlant,
        irrigationFrequency:     fert.irrigationFrequency,
        nitrogenAdvice:          fert.nitrogenAdvice,
        phosphorusAdvice:        fert.phosphorusAdvice,
        potassiumAdvice:         fert.potassiumAdvice,
        fertilizerPlan:          JSON.stringify(fert.fertilizerPlan),
        riskSummary:             fert.riskSummary,
        estimatedCost:           fert.estimatedCost,
        confidenceScore:         fert.confidenceScore,
      },
    });

    return { recommendationId: rec.id, recommendationTitle: rec.title };
  });

  if ("recommendationId" in result) {
    await createRecommendationNotification({
      userId,
      recommendationId: result.recommendationId,
      title:            result.recommendationTitle,
      fieldId:          input.fieldId,
    });
  }

  return { recommendationId: result.recommendationId };
}
