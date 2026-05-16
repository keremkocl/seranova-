import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeatherForField, isExternalWeatherConfigured } from "@/lib/weather-provider";
import { createNotification } from "@/lib/notification-engine";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const fields = await prisma.field.findMany({
    where:  { userId },
    select: { id: true, name: true, locationLat: true, locationLng: true },
  });

  if (fields.length === 0) {
    return NextResponse.json({
      created:  0,
      source:   null,
      provider: null,
      external: isExternalWeatherConfigured(),
      message:  "Kayıtlı sera bulunmadığı için hava verisi oluşturulmadı.",
    });
  }

  let created = 0;
  let lastSource:   string | null = null;
  let lastProvider: string | null = null;

  for (const f of fields) {
    const snap = await getWeatherForField(f);

    await prisma.weatherReading.create({
      data: {
        fieldId:            f.id,
        outsideTemperature: snap.outsideTemperature,
        outsideHumidity:    snap.outsideHumidity,
        rainChance:         snap.rainChance,
        windSpeed:          snap.windSpeed,
        solarRadiation:     snap.solarRadiation,
        condition:          snap.condition,
        source:             snap.source,
        provider:           snap.provider,
      },
    });
    created++;
    lastSource   = snap.source;
    lastProvider = snap.provider;

    // ── Weather-driven notifications ──────────────────────────────────────
    const notifSource = snap.source === "EXTERNAL_API" ? "SYSTEM" : "SIMULATION";

    if (snap.rainChance > 70) {
      await createNotification({
        userId,
        type:           "WEATHER_ALERT",
        severity:       "WARNING",
        source:         notifSource,
        title:          "Yüksek yağmur ihtimali",
        message:        `${f.name} · Yağmur ihtimali %${snap.rainChance.toFixed(0)} — sulama dozunu azaltmayı düşünün.`,
        relatedFieldId: f.id,
      });
    }

    if (snap.outsideTemperature > 35) {
      await createNotification({
        userId,
        type:           "WEATHER_ALERT",
        severity:       "CRITICAL",
        source:         notifSource,
        title:          "Kritik dış sıcaklık",
        message:        `${f.name} · Dış sıcaklık ${snap.outsideTemperature.toFixed(1)}°C — sera soğutma kapasitesi baskı altında.`,
        relatedFieldId: f.id,
      });
    } else if (snap.outsideTemperature > 30) {
      await createNotification({
        userId,
        type:           "WEATHER_ALERT",
        severity:       "WARNING",
        source:         notifSource,
        title:          "Yüksek dış sıcaklık",
        message:        `${f.name} · Dış sıcaklık ${snap.outsideTemperature.toFixed(1)}°C — havalandırmayı erken açın.`,
        relatedFieldId: f.id,
      });
    }
  }

  return NextResponse.json({
    created,
    source:   lastSource,
    provider: lastProvider,
    external: isExternalWeatherConfigured(),
  });
}
