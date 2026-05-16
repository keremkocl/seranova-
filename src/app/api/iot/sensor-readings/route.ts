import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSensorAlert } from "@/lib/notification-engine";

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asBoolean(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}
function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
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

  const reading = await prisma.sensorReading.create({
    data: {
      fieldId,
      temperature:   asNumber(body.temperature),
      humidity:      asNumber(body.humidity),
      ph:            asNumber(body.ph),
      ec:            asNumber(body.ec),
      lightLevel:    asNumber(body.lightLevel),
      soilMoisture:  asNumber(body.soilMoisture),
      irrigationOn:  asBoolean(body.irrigationOn),
      ventilationOn: asBoolean(body.ventilationOn),
      lightingOn:    asBoolean(body.lightingOn),
      source:        "DEVICE_API",
      deviceId:      asString(body.deviceId),
      apiKeyLabel:   "default",
    },
  });

  const alertsCreated = await createSensorAlert(
    field.userId,
    field.id,
    {
      temperature:  reading.temperature,
      humidity:     reading.humidity,
      soilMoisture: reading.soilMoisture,
      lightLevel:   reading.lightLevel,
      ec:           reading.ec,
      ph:           reading.ph,
    },
    "DEVICE_API",
  );

  return NextResponse.json({
    ok:             true,
    id:             reading.id,
    fieldId:        reading.fieldId,
    createdAt:      reading.createdAt.toISOString(),
    source:         reading.source,
    alertsCreated,
  });
}
