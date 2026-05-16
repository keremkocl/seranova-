import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  FieldType,
  AnalysisStatus,
  RecommendationStatus,
  GrowthStage,
  AutomationMode,
  EventSeverity,
  WeatherCondition,
  SensorDataSource,
  WeatherDataSource,
} from "../src/generated/prisma/client";

import {
  generateRecommendation,
  generateTitle,
} from "../src/lib/recommendation-engine";
import { runFertigation } from "../src/lib/fertigation-engine";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Users
  const farmer = await prisma.user.upsert({
    where: { email: "farmer@example.com" },
    update: { password: hashedPassword },
    create: { email: "farmer@example.com", name: "Demo Çiftçi", password: hashedPassword, role: Role.FARMER },
  });

  const consultant = await prisma.user.upsert({
    where: { email: "consultant@example.com" },
    update: { password: hashedPassword },
    create: { email: "consultant@example.com", name: "Demo Danışman", password: hashedPassword, role: Role.CONSULTANT },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { password: hashedPassword },
    create: { email: "admin@example.com", name: "Demo Admin", password: hashedPassword, role: Role.ADMIN },
  });

  // Organization
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-001" },
    update: {},
    create: { id: "seed-org-001", name: "Sera Üreticisi Demo" },
  });

  // Memberships
  for (const [userId, role] of [
    [farmer.id, Role.FARMER],
    [consultant.id, Role.CONSULTANT],
    [admin.id, Role.ADMIN],
  ] as const) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: org.id } },
      update: {},
      create: { userId, organizationId: org.id, role },
    });
  }

  // Field — Antalya merkez koordinatları (weather provider default ile aynı).
  const field = await prisma.field.upsert({
    where: { id: "seed-field-001" },
    update: {
      automationMode:    AutomationMode.AUTO,
      automationEnabled: true,
      locationLat:       36.8969,
      locationLng:       30.7133,
    },
    create: {
      id: "seed-field-001",
      name: "Demo Sera A",
      type: FieldType.GREENHOUSE,
      areaHectares: 0.5,
      locationLat:  36.8969,
      locationLng:  30.7133,
      userId: farmer.id,
      organizationId: org.id,
      automationEnabled: true,
      automationMode: AutomationMode.AUTO,
    },
  });

  // Crops with different growth stages
  const tomato = await prisma.crop.upsert({
    where: { id: "seed-crop-001" },
    update: { growthStage: GrowthStage.FRUITING, expectedHarvest: new Date("2026-06-15"), plantCount: 320 },
    create: {
      id: "seed-crop-001",
      name: "Domates",
      variety: "Salkım Domates",
      fieldId: field.id,
      plantedAt: new Date("2026-02-10"),
      growthStage: GrowthStage.FRUITING,
      expectedHarvest: new Date("2026-06-15"),
      plantCount: 320,
    },
  });

  const pepper = await prisma.crop.upsert({
    where: { id: "seed-crop-002" },
    update: { growthStage: GrowthStage.VEGETATIVE, plantCount: 200 },
    create: {
      id: "seed-crop-002",
      name: "Biber",
      variety: "Sivri Biber",
      fieldId: field.id,
      plantedAt: new Date("2026-03-20"),
      growthStage: GrowthStage.VEGETATIVE,
      expectedHarvest: new Date("2026-07-30"),
      plantCount: 200,
    },
  });

  const cucumber = await prisma.crop.upsert({
    where: { id: "seed-crop-003" },
    update: { growthStage: GrowthStage.FLOWERING, plantCount: 280 },
    create: {
      id: "seed-crop-003",
      name: "Salatalık",
      variety: "Kemer Salatalık",
      fieldId: field.id,
      plantedAt: new Date("2026-03-01"),
      growthStage: GrowthStage.FLOWERING,
      expectedHarvest: new Date("2026-06-30"),
      plantCount: 280,
    },
  });

  // Soil Analysis for tomato (FRUITING)
  const soilTomato = await prisma.soilAnalysis.upsert({
    where: { id: "seed-soil-001" },
    update: {},
    create: {
      id: "seed-soil-001",
      fieldId: field.id,
      cropId: tomato.id,
      status: AnalysisStatus.REVIEWED,
      ph: 6.4,
      ec: 3.1,
      nitrogen: 38.0,
      phosphorus: 28.5,
      potassium: 185.0,
      organicMatter: 2.8,
      notes: "Meyve bağlama evresinde EC biraz yüksek.",
      analyzedAt: new Date("2026-04-20"),
    },
  });

  // Soil Analysis for pepper (VEGETATIVE)
  const soilPepper = await prisma.soilAnalysis.upsert({
    where: { id: "seed-soil-002" },
    update: {},
    create: {
      id: "seed-soil-002",
      fieldId: field.id,
      cropId: pepper.id,
      status: AnalysisStatus.SUBMITTED,
      ph: 7.2,
      ec: 1.4,
      nitrogen: 85.0,
      phosphorus: 15.0,
      potassium: 120.0,
      organicMatter: 1.5,
      notes: "Azot fazlası ve fosfor eksikliği tespit edildi.",
      analyzedAt: new Date("2026-05-01"),
    },
  });

  // Water Analysis
  const waterAnalysis = await prisma.waterAnalysis.upsert({
    where: { id: "seed-water-001" },
    update: {},
    create: {
      id: "seed-water-001",
      fieldId: field.id,
      status: AnalysisStatus.REVIEWED,
      ph: 7.1,
      ec: 1.8,
      hardness: 320.0,
      nitrate: 12.5,
      notes: "Su kalitesi sulama için uygundur.",
      analyzedAt: new Date("2026-04-18"),
    },
  });

  // Generate recommendation + fertigation plan content via engines
  const tomatoSoil   = { ph: 6.4, ec: 3.1, nitrogen: 38.0,  phosphorus: 28.5, potassium: 185.0, organicMatter: 2.8 };
  const pepperSoil   = { ph: 7.2, ec: 1.4, nitrogen: 85.0,  phosphorus: 15.0, potassium: 120.0, organicMatter: 1.5 };
  const cucumberSoil = { ph: 6.8, ec: 2.2, nitrogen: 45.0,  phosphorus: 32.0, potassium: 210.0, organicMatter: 3.2 };
  const sharedWater  = { ph: 7.1, ec: 1.8 };

  const tomatoContent   = generateRecommendation({ cropName: "Domates",   growthStage: "FRUITING",   soil: tomatoSoil,   water: sharedWater });
  const pepperContent   = generateRecommendation({ cropName: "Biber",     growthStage: "VEGETATIVE", soil: pepperSoil });
  const cucumberContent = generateRecommendation({ cropName: "Salatalık", growthStage: "FLOWERING",  soil: cucumberSoil, water: sharedWater });

  const tomatoFert   = runFertigation({ cropName: "Domates",   growthStage: "FRUITING",   soil: tomatoSoil,   water: sharedWater, plantCount: 320 });
  const pepperFert   = runFertigation({ cropName: "Biber",     growthStage: "VEGETATIVE", soil: pepperSoil,   plantCount: 200 });
  const cucumberFert = runFertigation({ cropName: "Salatalık", growthStage: "FLOWERING",  soil: cucumberSoil, water: sharedWater, plantCount: 280 });

  function fertFields(f: ReturnType<typeof runFertigation>) {
    return {
      targetPh:                 f.targetPh,
      targetEc:                 f.targetEc,
      irrigationLitersPerPlant: f.irrigationLitersPerPlant,
      irrigationFrequency:      f.irrigationFrequency,
      nitrogenAdvice:           f.nitrogenAdvice,
      phosphorusAdvice:         f.phosphorusAdvice,
      potassiumAdvice:          f.potassiumAdvice,
      fertilizerPlan:           JSON.stringify(f.fertilizerPlan),
      riskSummary:              f.riskSummary,
      estimatedCost:            f.estimatedCost,
      confidenceScore:          f.confidenceScore,
    };
  }

  // Recommendation 1: Tomato FRUITING → APPROVED
  const recTomato = await prisma.recommendation.upsert({
    where: { id: "seed-rec-001" },
    update: {
      content: JSON.stringify(tomatoContent),
      status: RecommendationStatus.APPROVED,
      consultantNote: "Potasyum takviyesi doğru. EC düşürmek için sulama sıklığını artırın.",
      ...fertFields(tomatoFert),
    },
    create: {
      id: "seed-rec-001",
      title: generateTitle("Domates", "FRUITING"),
      content: JSON.stringify(tomatoContent),
      status: RecommendationStatus.APPROVED,
      farmerId: farmer.id,
      fieldId: field.id,
      cropId: tomato.id,
      soilAnalysisId: soilTomato.id,
      waterAnalysisId: waterAnalysis.id,
      consultantNote: "Potasyum takviyesi doğru. EC düşürmek için sulama sıklığını artırın.",
      ...fertFields(tomatoFert),
    },
  });

  // Recommendation 2: Pepper VEGETATIVE → SUBMITTED (awaiting review)
  await prisma.recommendation.upsert({
    where: { id: "seed-rec-002" },
    update: { content: JSON.stringify(pepperContent), status: RecommendationStatus.SUBMITTED, ...fertFields(pepperFert) },
    create: {
      id: "seed-rec-002",
      title: generateTitle("Biber", "VEGETATIVE"),
      content: JSON.stringify(pepperContent),
      status: RecommendationStatus.SUBMITTED,
      farmerId: farmer.id,
      fieldId: field.id,
      cropId: pepper.id,
      soilAnalysisId: soilPepper.id,
      ...fertFields(pepperFert),
    },
  });

  // Recommendation 3: Cucumber FLOWERING → REVISED
  await prisma.recommendation.upsert({
    where: { id: "seed-rec-003" },
    update: {
      content: JSON.stringify(cucumberContent),
      status: RecommendationStatus.REVISED,
      consultantNote: "Sulama suyu EC değerini tekrar ölçtürün, sonra yeniden gönderin.",
      ...fertFields(cucumberFert),
    },
    create: {
      id: "seed-rec-003",
      title: generateTitle("Salatalık", "FLOWERING"),
      content: JSON.stringify(cucumberContent),
      status: RecommendationStatus.REVISED,
      farmerId: farmer.id,
      fieldId: field.id,
      cropId: cucumber.id,
      waterAnalysisId: waterAnalysis.id,
      consultantNote: "Sulama suyu EC değerini tekrar ölçtürün, sonra yeniden gönderin.",
      ...fertFields(cucumberFert),
    },
  });

  // Consultant review for approved tomato rec
  await prisma.consultantReview.upsert({
    where: { id: "seed-review-001" },
    update: {},
    create: {
      id: "seed-review-001",
      recommendationId: recTomato.id,
      consultantId: consultant.id,
      comment: "Öneri uygun görülmüştür. EC kontrolü için sulama takvimi güncellendi.",
      approved: true,
    },
  });

  // Sensor readings — last 7 days (one per day at 10:00)
  await prisma.sensorReading.deleteMany({ where: { fieldId: field.id } });

  const SENSOR_DAYS = [
    { daysAgo: 6, temp: 23.5, hum: 72, ph: 6.4, ec: 2.1, light: 58000, soil: 68, irr: false, vent: true,  lit: false },
    { daysAgo: 5, temp: 25.2, hum: 68, ph: 6.5, ec: 2.3, light: 62000, soil: 65, irr: true,  vent: true,  lit: false },
    { daysAgo: 4, temp: 24.8, hum: 70, ph: 6.6, ec: 2.2, light: 55000, soil: 70, irr: false, vent: true,  lit: true  },
    { daysAgo: 3, temp: 26.1, hum: 65, ph: 6.3, ec: 2.5, light: 68000, soil: 62, irr: false, vent: true,  lit: false },
    { daysAgo: 2, temp: 27.4, hum: 63, ph: 6.4, ec: 2.4, light: 71000, soil: 60, irr: true,  vent: true,  lit: false },
    { daysAgo: 1, temp: 25.9, hum: 67, ph: 6.5, ec: 2.6, light: 64000, soil: 66, irr: false, vent: true,  lit: true  },
    { daysAgo: 0, temp: 28.5, hum: 69, ph: 6.4, ec: 2.3, light: 59000, soil: 52, irr: true,  vent: true,  lit: false },
  ] as const;

  for (const row of SENSOR_DAYS) {
    const ts = new Date();
    ts.setDate(ts.getDate() - row.daysAgo);
    ts.setHours(10, 0, 0, 0);
    await prisma.sensorReading.create({
      data: {
        fieldId:       field.id,
        temperature:   row.temp,
        humidity:      row.hum,
        ph:            row.ph,
        ec:            row.ec,
        lightLevel:    row.light,
        soilMoisture:  row.soil,
        irrigationOn:  row.irr,
        ventilationOn: row.vent,
        lightingOn:    row.lit,
        source:        SensorDataSource.SIMULATION,
        createdAt:     ts,
      },
    });
  }

  // AutomationEvents — historical activity log
  await prisma.automationEvent.deleteMany({ where: { fieldId: field.id } });

  const EVENT_LOG = [
    { daysAgo: 6, h: 8,  type: "MODE_CHANGED_TO_AUTO",     message: "Otomasyon modu etkinleştirildi. AI kontrol devralındı.",            severity: EventSeverity.INFO     },
    { daysAgo: 6, h: 10, type: "VENTILATION_ON",            message: "Sıcaklık yüksek (23.5°C). Havalandırma açıldı.",                   severity: EventSeverity.WARNING  },
    { daysAgo: 5, h: 10, type: "IRRIGATION_ON",             message: "Toprak nemi düşük (%65). Sulama başlatıldı.",                       severity: EventSeverity.INFO     },
    { daysAgo: 4, h: 9,  type: "MODE_CHANGED_TO_MANUAL",   message: "Manuel mod etkinleştirildi. Cihazlar kullanıcı kontrolünde.",        severity: EventSeverity.INFO     },
    { daysAgo: 4, h: 9,  type: "MANUAL_LIGHTINGON_ON",     message: "Yapay aydınlatma manuel olarak açıldı.",                            severity: EventSeverity.INFO     },
    { daysAgo: 4, h: 14, type: "MODE_CHANGED_TO_AUTO",     message: "Otomasyon modu etkinleştirildi. AI kontrol devralındı.",             severity: EventSeverity.INFO     },
    { daysAgo: 3, h: 10, type: "VENTILATION_ON",            message: "Sıcaklık artışı izleniyor (26.1°C). Havalandırma açık tutuldu.",    severity: EventSeverity.WARNING  },
    { daysAgo: 2, h: 10, type: "VENTILATION_ON_CRITICAL_TEMP", message: "Sıcaklık kritik (27.4°C). Havalandırma acil açıldı.",           severity: EventSeverity.CRITICAL },
    { daysAgo: 2, h: 10, type: "IRRIGATION_ON",             message: "Toprak nemi kritik (%60). Sulama başlatıldı.",                      severity: EventSeverity.WARNING  },
    { daysAgo: 1, h: 10, type: "LIGHTING_ON",               message: "Işık seviyesi düşük (64 klux). Yapay aydınlatma açıldı.",          severity: EventSeverity.INFO     },
    { daysAgo: 0, h: 10, type: "VENTILATION_ON",            message: "Sıcaklık yüksek (28.5°C). Havalandırma açıldı.",                   severity: EventSeverity.WARNING  },
    { daysAgo: 0, h: 10, type: "IRRIGATION_ON",             message: "Toprak nemi düşük (%52). Sulama başlatıldı.",                       severity: EventSeverity.WARNING  },
  ] as const;

  for (const ev of EVENT_LOG) {
    const ts = new Date();
    ts.setDate(ts.getDate() - ev.daysAgo);
    ts.setHours(ev.h, 0, 0, 0);
    await prisma.automationEvent.create({
      data: { fieldId: field.id, type: ev.type, message: ev.message, severity: ev.severity, createdAt: ts },
    });
  }

  // Weather readings — last 7 days (one per day at 08:00)
  await prisma.weatherReading.deleteMany({ where: { fieldId: field.id } });

  const WEATHER_DAYS = [
    { daysAgo: 6, outTemp: 22.0, outHum: 45, rainChance:  5, wind:  8, solar: 680, cond: WeatherCondition.SUNNY   },
    { daysAgo: 5, outTemp: 18.5, outHum: 62, rainChance: 25, wind: 12, solar: 350, cond: WeatherCondition.CLOUDY  },
    { daysAgo: 4, outTemp: 14.8, outHum: 85, rainChance: 88, wind: 20, solar: 110, cond: WeatherCondition.RAINY   },
    { daysAgo: 3, outTemp: 17.2, outHum: 72, rainChance: 40, wind: 15, solar: 280, cond: WeatherCondition.CLOUDY  },
    { daysAgo: 2, outTemp: 24.5, outHum: 38, rainChance:  5, wind:  6, solar: 720, cond: WeatherCondition.SUNNY   },
    { daysAgo: 1, outTemp: 19.1, outHum: 55, rainChance: 15, wind: 45, solar: 480, cond: WeatherCondition.WINDY   },
    { daysAgo: 0, outTemp: 25.2, outHum: 42, rainChance:  8, wind: 10, solar: 650, cond: WeatherCondition.SUNNY   },
  ] as const;

  for (const row of WEATHER_DAYS) {
    const ts = new Date();
    ts.setDate(ts.getDate() - row.daysAgo);
    ts.setHours(8, 0, 0, 0);
    await prisma.weatherReading.create({
      data: {
        fieldId:            field.id,
        outsideTemperature: row.outTemp,
        outsideHumidity:    row.outHum,
        rainChance:         row.rainChance,
        windSpeed:          row.wind,
        solarRadiation:     row.solar,
        condition:          row.cond,
        source:             WeatherDataSource.SIMULATION,
        provider:           "Demo Generator",
        createdAt:          ts,
      },
    });
  }

  // ── Demo notifications ─────────────────────────────────────────────────────
  await prisma.notification.deleteMany({ where: { userId: farmer.id } });

  const now2 = new Date();
  const ago = (mins: number) => new Date(now2.getTime() - mins * 60_000);

  await prisma.notification.createMany({
    data: [
      {
        userId: farmer.id,
        title:  "Kritik sıcaklık alarmı",
        message:"Sera sıcaklığı 36.2°C — bitki yanma riski yüksek. Acil havalandırma!",
        type:    "SENSOR_ALERT",
        severity:"CRITICAL",
        source:  "SIMULATION",
        relatedFieldId: field.id,
        isRead:  false,
        createdAt: ago(15),
      },
      {
        userId: farmer.id,
        title:  "Düşük toprak nemi",
        message:"Toprak nemi %42 — sulama gerekebilir.",
        type:    "SENSOR_ALERT",
        severity:"WARNING",
        source:  "SIMULATION",
        relatedFieldId: field.id,
        isRead:  false,
        createdAt: ago(45),
      },
      {
        userId: farmer.id,
        title:  "Yeni AI önerisi hazır",
        message:`${recTomato.title} — fertigation reçetenizi inceleyebilirsiniz.`,
        type:    "AI_RECOMMENDATION",
        severity:"INFO",
        source:  "SYSTEM",
        relatedRecommendationId: recTomato.id,
        relatedFieldId: field.id,
        isRead:  false,
        createdAt: ago(120),
      },
      {
        userId: farmer.id,
        title:  "Havalandırma açıldı",
        message:"Demo Sera A · Sıcaklık 28.5°C — havalandırma otomatik açıldı.",
        type:    "AUTOMATION_EVENT",
        severity:"INFO",
        source:  "SIMULATION",
        relatedFieldId: field.id,
        isRead:  true,
        createdAt: ago(240),
      },
      {
        userId: farmer.id,
        title:  "Planlı bakım",
        message:"FertilAI 12 Mayıs gece yarısı 30 dakikalığına bakım modunda olacaktır.",
        type:    "SYSTEM",
        severity:"INFO",
        source:  "SYSTEM",
        isRead:  true,
        createdAt: ago(1440),
      },
    ],
  });

  console.log("Seed tamamlandı: 3 ürün, 3 öneri, 7 sensör okuması, 12 otomasyon olayı, 7 hava durumu okuması, 5 bildirim.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
