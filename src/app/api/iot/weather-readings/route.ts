import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WeatherCondition } from "@/generated/prisma/client";

const VALID_CONDITIONS = new Set<WeatherCondition>([
  "SUNNY", "CLOUDY", "RAINY", "WINDY", "STORMY",
]);

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
function asCondition(v: unknown): WeatherCondition {
  if (typeof v === "string" && VALID_CONDITIONS.has(v as WeatherCondition)) {
    return v as WeatherCondition;
  }
  return "SUNNY";
}

export async function POST(req: Request) {
  const key = req.headers.get("x-fertilai-device-key");
  const expected = process.env.FERTILAI_DEVICE_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Server misconfigured: device API key not set." }, { status: 500 });
  }
  if (!key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fieldId = asString(body.fieldId);
  if (!fieldId) {
    return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
  }

  const field = await prisma.field.findUnique({ where: { id: fieldId } });
  if (!field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  const reading = await prisma.weatherReading.create({
    data: {
      fieldId,
      outsideTemperature: asNumber(body.outsideTemperature),
      outsideHumidity:    asNumber(body.outsideHumidity),
      rainChance:         asNumber(body.rainChance),
      windSpeed:          asNumber(body.windSpeed),
      solarRadiation:     asNumber(body.solarRadiation),
      condition:          asCondition(body.condition),
      source:             "EXTERNAL_API",
      provider:           asString(body.provider),
    },
  });

  return NextResponse.json({
    ok:        true,
    id:        reading.id,
    fieldId:   reading.fieldId,
    createdAt: reading.createdAt.toISOString(),
    source:    reading.source,
    provider:  reading.provider,
  });
}
