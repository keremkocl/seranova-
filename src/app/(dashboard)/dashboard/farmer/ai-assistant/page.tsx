import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MockChat from "@/components/ai-assistant/MockChat";
import LiveStatus from "@/components/analytics/LiveStatus";
import { generateAssistantOutput } from "@/lib/ai-assistant-engine";
import { GROWTH_STAGE_LABELS } from "@/lib/recommendation-engine";
import type { GrowthStage } from "@/lib/recommendation-engine";
import type { AISeverity } from "@/lib/ai-assistant-engine";
import {
  Sparkles, Thermometer, Droplets, Gauge, Zap, Sun, Sprout,
  Brain, Sliders, CloudSun, Leaf, TriangleAlert, FlaskConical,
  ChevronRight, ShieldAlert, BellRing, MessageCircle,
} from "lucide-react";
import type { FertilizerLineItem } from "@/lib/fertigation-engine";
import Link from "next/link";
import { SENSOR_SOURCE_META, WEATHER_SOURCE_META } from "@/lib/data-source";

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AISeverity, { border: string; bg: string; badge: string; dot: string }> = {
  ok:       { border: "border-green-200",  bg: "bg-green-50/40",  badge: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
  warn:     { border: "border-amber-200",  bg: "bg-amber-50/40",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  critical: { border: "border-red-200",    bg: "bg-red-50/40",    badge: "bg-red-100 text-red-700",      dot: "bg-red-500"    },
  info:     { border: "border-blue-200",   bg: "bg-blue-50/40",   badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-400"   },
};

const SEVERITY_LABELS: Record<AISeverity, string> = {
  ok: "Normal", warn: "Dikkat", critical: "Kritik", info: "Bilgi",
};

const CATEGORY_META = {
  climate:       { icon: CloudSun,      label: "İklim",     color: "text-blue-600  bg-blue-50"   },
  irrigation:    { icon: Droplets,      label: "Sulama",    color: "text-cyan-600  bg-cyan-50"   },
  fertilization: { icon: Leaf,          label: "Gübreleme", color: "text-green-600 bg-green-50"  },
  risk:          { icon: TriangleAlert, label: "Risk",      color: "text-amber-600 bg-amber-50"  },
} as const;

// ─── Chat questions & deterministic answer engine ────────────────────────────

const CHAT_QUESTIONS = [
  { id: "1", label: "Bugün neye dikkat etmeliyim?" },
  { id: "2", label: "Sulama gerekli mi?"           },
  { id: "3", label: "pH ve EC durumu nasıl?"       },
  { id: "4", label: "Gübreleme planım uygun mu?"   },
  { id: "5", label: "Serada risk var mı?"          },
] as const;

interface ChatAnswer {
  severity:   "ok" | "warn" | "critical" | "info";
  paragraphs: string[];
  bullets:    string[];
  action?:    string;
}

type SensorSnap = {
  temperature:  number | null;
  humidity:     number | null;
  ph:           number | null;
  ec:           number | null;
  soilMoisture: number | null;
  lightLevel:   number | null;
} | null;

type RecSnap = {
  title:                    string;
  confidenceScore:          number | null;
  estimatedCost:            string | null;
  riskSummary:              string | null;
  irrigationLitersPerPlant: number | null;
  irrigationFrequency:      string | null;
  nitrogenAdvice:           string | null;
  phosphorusAdvice:         string | null;
  potassiumAdvice:          string | null;
  targetPh:                 string | null;
  targetEc:                 string | null;
} | null;

type WeatherSnap = {
  outsideTemperature: number | null;
  rainChance:         number | null;
  windSpeed:          number | null;
} | null;

function buildChatAnswer(
  qId: string,
  sensor:      SensorSnap,
  latestRec:   RecSnap,
  weather:     WeatherSnap,
  alarmCount:  number,
  fertPlan:    FertilizerLineItem[],
  cropName:    string | null,
): ChatAnswer {
  // ── Q1: Bugün neye dikkat etmeliyim? ──────────────────────────────────────
  if (qId === "1") {
    const issues: string[] = [];
    let severity: ChatAnswer["severity"] = "ok";

    if (!sensor) {
      return {
        severity: "info",
        paragraphs: ["Sensör verisi henüz bağlı değil. Demo modunda genel öneriler sunulabilir."],
        bullets: [
          "Sabah erken sera havasını kontrol edin.",
          "Toprak nemini elle kontrol edin.",
          "Yapraklarda anormal renk veya solma işaretlerine bakın.",
        ],
        action: "Sensör bağlantısı için POST /api/iot/sensor-readings endpoint'ini kullanın.",
      };
    }

    if ((sensor.temperature ?? 0) > 30) { issues.push(`Sıcaklık kritik: ${sensor.temperature?.toFixed(1)}°C — sera aşırı ısınıyor`); severity = "critical"; }
    else if ((sensor.temperature ?? 0) > 27) { issues.push(`Sıcaklık yüksek: ${sensor.temperature?.toFixed(1)}°C — havalandırmayı artırın`); if (severity === "ok") severity = "warn"; }

    if ((sensor.humidity ?? 0) > 85) { issues.push(`Nem çok yüksek: %${sensor.humidity?.toFixed(0)} — fungal risk artar`); if (severity === "ok") severity = "warn"; }

    if (sensor.soilMoisture != null && sensor.soilMoisture < 50) { issues.push(`Toprak nemi kritik: %${sensor.soilMoisture.toFixed(0)} — acil sulama gerekli`); severity = "critical"; }
    else if (sensor.soilMoisture != null && sensor.soilMoisture < 65) { issues.push(`Toprak nemi düşük: %${sensor.soilMoisture.toFixed(0)} — bugün sulama planlayın`); if (severity === "ok") severity = "warn"; }

    if (sensor.ph != null && (sensor.ph < 5.5 || sensor.ph > 7.5)) { issues.push(`pH dengesiz: ${sensor.ph.toFixed(1)} — besin alımı kısıtlanıyor`); if (severity === "ok") severity = "warn"; }
    if ((sensor.ec ?? 0) > 3.5) { issues.push(`EC yüksek: ${sensor.ec?.toFixed(1)} dS/m — kök yanması riski`); if (severity === "ok") severity = "warn"; }
    if (alarmCount > 0) { issues.push(`${alarmCount} okunmamış kritik bildirim var`); severity = "critical"; }

    if (issues.length === 0) {
      return {
        severity: "ok",
        paragraphs: [`${cropName ?? "Seranız"} için tüm parametreler normal aralıkta. Rutin kontrol yeterli.`],
        bullets: [
          `Sıcaklık ${sensor.temperature?.toFixed(1)}°C — optimal`,
          `Nem %${sensor.humidity?.toFixed(0)} — dengeli`,
          `Toprak nemi %${sensor.soilMoisture?.toFixed(0)} — uygun`,
          `pH ${sensor.ph?.toFixed(1)} · EC ${sensor.ec?.toFixed(1)} dS/m — hedef aralıkta`,
        ],
        action: "Bugün özel bir işlem gerekmez. Akşam nem ve sıcaklık kontrolü yapmanız yeterli.",
      };
    }

    return {
      severity,
      paragraphs: [`${issues.length} öncelikli konu tespit edildi:`],
      bullets: issues,
      action: severity === "critical" ? "Kritik parametreler için hemen müdahale edin." : "Gün içinde bu noktaları takip edin.",
    };
  }

  // ── Q2: Sulama gerekli mi? ─────────────────────────────────────────────────
  if (qId === "2") {
    const moisture  = sensor?.soilMoisture ?? null;
    const rainPct   = weather?.rainChance  ?? 0;
    const irrigDose = latestRec?.irrigationLitersPerPlant;
    const irrigFreq = latestRec?.irrigationFrequency;

    if (moisture === null) {
      return {
        severity: "info",
        paragraphs: ["Toprak nem sensörü verisi yok. Sulama kararını görsel kontrolle verin."],
        bullets: [
          "Toprağı 5 cm derinliğe kadar elle kontrol edin.",
          "Yapraklarda solma veya pörsüme varsa hemen sulayın.",
          irrigFreq ? `Reçete önerisi: ${irrigFreq}` : "Sulama sıklığı için toprak analizi yapın.",
        ],
        action: irrigDose ? `Doz: ${irrigDose.toFixed(1)} L/bitki` : undefined,
      };
    }

    if (rainPct > 70) {
      return {
        severity: "warn",
        paragraphs: ["Yağmur ihtimali yüksek, sulama sistemi kapatılmalı."],
        bullets: [
          `Dış yağmur ihtimali: %${rainPct.toFixed(0)} — doğal sulama bekleniyor`,
          `Mevcut toprak nemi: %${moisture.toFixed(0)}`,
          "Aşırı sulama kök çürümesine yol açabilir.",
        ],
        action: "Otomatik sulama sistemini bugün devre dışı bırakın.",
      };
    }

    if (moisture < 50) {
      return {
        severity: "critical",
        paragraphs: ["Toprak nemi kritik seviyede. Acil sulama gerekli."],
        bullets: [
          `Toprak nemi: %${moisture.toFixed(0)} (kritik eşik: %50)`,
          irrigDose ? `Önerilen doz: ${irrigDose.toFixed(1)} L/bitki` : "Standart doz: 0.8–1.2 L/bitki",
          irrigFreq ? `Sıklık: ${irrigFreq}` : "Günlük sabah sulaması önerilir",
        ],
        action: "Şu an sulama başlatın. Toprak nemi %65 seviyesine ulaşınca durdurun.",
      };
    }

    if (moisture < 65) {
      return {
        severity: "warn",
        paragraphs: ["Toprak nemi biraz düşük, bugün sulama planlanmalı."],
        bullets: [
          `Toprak nemi: %${moisture.toFixed(0)} (öneri: %65–75)`,
          irrigDose ? `Sulama dozu: ${irrigDose.toFixed(1)} L/bitki` : "Orta doz sulama yeterli",
          irrigFreq ? `Sıklık: ${irrigFreq}` : "2 günde bir sulama önerilir",
        ],
        action: "Öğlen saatlerinde sulama yapın. Yaprak ıslanmasından kaçının.",
      };
    }

    return {
      severity: "ok",
      paragraphs: ["Sulama gerekmiyor. Toprak nemi yeterli."],
      bullets: [
        `Toprak nemi: %${moisture.toFixed(0)} — optimal aralık (65–75%)`,
        rainPct > 30 ? `Yağmur ihtimali %${rainPct.toFixed(0)} — ek sulama gerekmez` : "Hava kuru ama toprak nemi dengeli",
        irrigFreq ? `Planlı sulama: ${irrigFreq}` : "Periyodik kontrol yeterli",
      ],
      action: "Bir sonraki sulama için toprak neminin %60 altına düşmesini bekleyin.",
    };
  }

  // ── Q3: pH ve EC durumu nasıl? ─────────────────────────────────────────────
  if (qId === "3") {
    if (!sensor || (sensor.ph === null && sensor.ec === null)) {
      return {
        severity: "info",
        paragraphs: ["pH ve EC sensör verisi mevcut değil. Sulama suyu ve toprak analizi yapmanız gerekiyor."],
        bullets: [
          "İdeal pH aralığı: 5.5–7.0",
          "İdeal EC aralığı: 1.5–3.5 dS/m",
          "Analiz için 'Analizler' sayfasından yeni analiz ekleyin.",
        ],
      };
    }

    const pH  = sensor.ph;
    const ec  = sensor.ec;
    const tPh = latestRec?.targetPh;
    const tEc = latestRec?.targetEc;
    const issues: string[] = [];
    let severity: ChatAnswer["severity"] = "ok";

    if (pH !== null) {
      if (pH < 5.5)      { issues.push(`pH ${pH.toFixed(1)} — çok asidik; kireç (Ca(OH)₂) uygulayın`); severity = "warn"; }
      else if (pH > 7.5) { issues.push(`pH ${pH.toFixed(1)} — çok bazik; kükürt veya asidik gübre kullanın`); severity = "warn"; }
    }
    if (ec !== null && ec > 3.5) { issues.push(`EC ${ec.toFixed(1)} dS/m — yüksek tuz stresi; sulama dozunu artırın`); severity = "warn"; }
    if (ec !== null && ec < 0.8) { issues.push(`EC ${ec.toFixed(1)} dS/m — çok düşük; besin çözeltisini güçlendirin`); severity = "warn"; }

    return {
      severity,
      paragraphs: [severity === "ok" ? "pH ve EC dengeli. Besin alımı optimum." : "pH/EC değerlerinde düzeltme gerekiyor."],
      bullets: [
        pH !== null ? `Mevcut pH: ${pH.toFixed(1)}${tPh ? ` (hedef: ${tPh})` : " (ideal: 5.5–7.0)"}` : "pH: veri yok",
        ec !== null ? `Mevcut EC: ${ec.toFixed(1)} dS/m${tEc ? ` (hedef: ${tEc})` : " (ideal: 1.5–3.5)"}` : "EC: veri yok",
        ...issues,
      ],
      action: severity === "ok"
        ? "Haftada bir kez ölçüm tekrarlayın."
        : "Düzeltici madde uygulamasından 24 saat sonra tekrar ölçün.",
    };
  }

  // ── Q4: Gübreleme planım uygun mu? ────────────────────────────────────────
  if (qId === "4") {
    if (!latestRec) {
      return {
        severity: "info",
        paragraphs: ["Henüz onaylı bir gübreleme reçetesi yok. Toprak analizi yaparak kişiselleştirilmiş plan oluşturabilirsiniz."],
        bullets: [
          "Toprak analizi için 'Analizler → Yeni Analiz' sayfasına gidin.",
          "pH, EC, N, P, K ve organik madde değerlerini girin.",
          "AI motor otomatik reçete oluşturur.",
        ],
        action: "Yeni analiz oluşturmak için /dashboard/farmer/analyses/new adresine gidin.",
      };
    }

    const conf = latestRec.confidenceScore ?? 0;
    const bullets: string[] = [];
    if (latestRec.nitrogenAdvice)   bullets.push(`Azot (N): ${latestRec.nitrogenAdvice}`);
    if (latestRec.phosphorusAdvice) bullets.push(`Fosfor (P): ${latestRec.phosphorusAdvice}`);
    if (latestRec.potassiumAdvice)  bullets.push(`Potasyum (K): ${latestRec.potassiumAdvice}`);
    if (fertPlan.length > 0)        bullets.push(`${fertPlan.length} ürünlük uygulama planı hazır`);
    if (latestRec.estimatedCost)    bullets.push(`Tahmini maliyet: ${latestRec.estimatedCost}`);

    return {
      severity: conf >= 75 ? "ok" : "warn",
      paragraphs: [`"${latestRec.title}" reçetesi aktif. Güven skoru: %${conf.toFixed(0)}.`],
      bullets,
      action: conf >= 75
        ? "Reçete uygulamaya hazır. Tam plan için Fertigation sekmesine gidin."
        : "Güven skoru orta seviyede. Analizi yenileyerek daha kesin öneriler alın.",
    };
  }

  // ── Q5: Serada risk var mı? ────────────────────────────────────────────────
  const risks: string[] = [];
  let maxSeverity: ChatAnswer["severity"] = "ok";

  if (alarmCount > 0) { risks.push(`${alarmCount} okunmamış kritik bildirim`); maxSeverity = "critical"; }
  if ((sensor?.temperature ?? 0) > 30)   { risks.push(`Sıcaklık aşırı yüksek: ${sensor?.temperature?.toFixed(1)}°C`); maxSeverity = "critical"; }
  else if ((sensor?.temperature ?? 0) > 27) { risks.push(`Sıcaklık yüksek: ${sensor?.temperature?.toFixed(1)}°C`); if (maxSeverity === "ok") maxSeverity = "warn"; }
  if ((sensor?.humidity ?? 0) > 85)      { risks.push(`Nem çok yüksek: %${sensor?.humidity?.toFixed(0)} — fungal enfeksiyon riski`); if (maxSeverity === "ok") maxSeverity = "warn"; }
  if (sensor?.soilMoisture != null && sensor.soilMoisture < 50) { risks.push(`Toprak kuraklığı: %${sensor.soilMoisture.toFixed(0)}`); maxSeverity = "critical"; }
  if (sensor?.ph != null && (sensor.ph < 5.5 || sensor.ph > 7.5)) { risks.push(`pH dengesizliği: ${sensor.ph.toFixed(1)}`); if (maxSeverity === "ok") maxSeverity = "warn"; }
  if ((sensor?.ec ?? 0) > 3.5) { risks.push(`Tuz stresi: EC ${sensor?.ec?.toFixed(1)} dS/m`); if (maxSeverity === "ok") maxSeverity = "warn"; }
  if ((weather?.rainChance ?? 0) > 70) { risks.push(`Yüksek yağmur ihtimali: %${weather?.rainChance?.toFixed(0)}`); if (maxSeverity === "ok") maxSeverity = "warn"; }
  if ((weather?.windSpeed ?? 0) > 40)  { risks.push(`Güçlü rüzgar: ${weather?.windSpeed?.toFixed(0)} km/h`); if (maxSeverity === "ok") maxSeverity = "warn"; }
  if (latestRec?.riskSummary) { risks.push(`Reçete riski: ${latestRec.riskSummary.slice(0, 80)}...`); }

  if (risks.length === 0) {
    return {
      severity: "ok",
      paragraphs: ["Serada aktif risk tespit edilmedi. Tüm parametreler kontrol altında."],
      bullets: [
        sensor ? `Sıcaklık ${sensor.temperature?.toFixed(1)}°C, Nem %${sensor.humidity?.toFixed(0)} — normal` : "Sensör verisi bekleniyor",
        "Otomasyon sistemi aktif",
        alarmCount === 0 ? "Kritik bildirim yok" : `${alarmCount} bildirim var`,
      ],
      action: "Düzenli izlemeye devam edin. Haftalık toprak analizi önerilir.",
    };
  }

  return {
    severity: maxSeverity,
    paragraphs: [`${risks.length} risk faktörü tespit edildi:`],
    bullets: risks,
    action: maxSeverity === "critical" ? "Kritik riskleri hemen giderin. Gerekirse manuel müdahale yapın." : "Bu riskleri bugün gün içinde takip edin.",
  };
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "genel",       label: "Genel Özet"   },
  { id: "sulama",      label: "Sulama"       },
  { id: "fertigation", label: "Fertigation"  },
  { id: "risk",        label: "Risk Analizi" },
  { id: "chat",        label: "AI Chat"      },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── Small shared components ──────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}%</span>
    </div>
  );
}

function InsightCard({ ins }: { ins: { id: string; emoji: string; title: string; body: string; value: string; severity: AISeverity } }) {
  const st = SEVERITY_STYLES[ins.severity];
  return (
    <div className={`flex flex-col gap-2 p-4 rounded-xl border ${st.border} ${st.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{ins.emoji}</span>
          <p className="text-sm font-semibold text-gray-900">{ins.title}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${st.badge}`}>{ins.value}</span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{ins.body}</p>
      <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-black/5">
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        <span className="text-xs text-gray-400">{SEVERITY_LABELS[ins.severity]}</span>
      </div>
    </div>
  );
}

function RecCard({ rec }: { rec: { id: string; category: keyof typeof CATEGORY_META; severity: AISeverity; title: string; body: string; relatedMetric: string; confidence: number } }) {
  const { icon: CatIcon, label, color } = CATEGORY_META[rec.category];
  const st = SEVERITY_STYLES[rec.severity];
  return (
    <Card className={`border ${st.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-lg shrink-0 ${color}`}><CatIcon size={15} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{rec.title}</p>
              <Badge variant="outline" className="text-xs shrink-0">{label}</Badge>
            </div>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${st.badge}`}>
              {SEVERITY_LABELS[rec.severity]}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">{rec.body}</p>
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Güven skoru</span>
            <span className="font-medium text-gray-600">{rec.relatedMetric}</span>
          </div>
          <ConfidenceBar value={rec.confidence} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AIAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const [field, crops, soilAnalysis, waterAnalysis, recentWarnings, weatherReading, latestRec, activeAlarmCount] = await Promise.all([
    prisma.field.findFirst({
      where: { userId },
      include: { sensorReadings: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { name: "asc" },
    }),
    prisma.crop.findMany({ where: { field: { userId } }, orderBy: { updatedAt: "desc" }, take: 1 }),
    prisma.soilAnalysis.findFirst({ where: { field: { userId } }, orderBy: { createdAt: "desc" } }),
    prisma.waterAnalysis.findFirst({ where: { field: { userId } }, orderBy: { createdAt: "desc" } }),
    prisma.automationEvent.count({ where: { field: { userId }, severity: { in: ["WARNING", "CRITICAL"] } } }),
    prisma.weatherReading.findFirst({ where: { field: { userId } }, orderBy: { createdAt: "desc" } }),
    prisma.recommendation.findFirst({
      where: { farmerId: userId, status: { not: "DRAFT" }, confidenceScore: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, status: true, confidenceScore: true, estimatedCost: true,
        riskSummary: true, irrigationLitersPerPlant: true, irrigationFrequency: true,
        nitrogenAdvice: true, phosphorusAdvice: true, potassiumAdvice: true,
        fertilizerPlan: true, targetPh: true, targetEc: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false, severity: { in: ["WARNING", "CRITICAL"] } } }),
  ]);

  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Brain size={40} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Kayıtlı sera bulunamadı.</p>
        <p className="text-sm text-gray-400 mt-1">AI Asistan için önce bir sera tanımlamanız gerekiyor.</p>
      </div>
    );
  }

  const sensor = field.sensorReadings[0] ?? null;
  const crop   = crops[0] ?? null;
  const isAuto = field.automationMode === "AUTO";

  const engineInput = {
    sensor: sensor ? {
      temperature: sensor.temperature, humidity: sensor.humidity, ph: sensor.ph,
      ec: sensor.ec, lightLevel: sensor.lightLevel, soilMoisture: sensor.soilMoisture,
      irrigationOn: sensor.irrigationOn, ventilationOn: sensor.ventilationOn,
    } : null,
    soil: soilAnalysis ? {
      ph: soilAnalysis.ph, ec: soilAnalysis.ec, nitrogen: soilAnalysis.nitrogen,
      phosphorus: soilAnalysis.phosphorus, potassium: soilAnalysis.potassium,
      organicMatter: soilAnalysis.organicMatter,
    } : null,
    water: waterAnalysis ? { ph: waterAnalysis.ph, ec: waterAnalysis.ec } : null,
    weather: weatherReading ? {
      outsideTemperature: weatherReading.outsideTemperature, outsideHumidity: weatherReading.outsideHumidity,
      rainChance: weatherReading.rainChance, windSpeed: weatherReading.windSpeed,
      solarRadiation: weatherReading.solarRadiation, condition: weatherReading.condition,
    } : null,
    crop: crop ? {
      name: crop.name, growthStage: crop.growthStage, plantedAt: crop.plantedAt,
      expectedHarvest: crop.expectedHarvest, plantCount: crop.plantCount,
    } : null,
    automationMode: (field.automationMode ?? "AUTO") as "AUTO" | "MANUAL",
    warningCount: recentWarnings,
  };

  const { insights, recommendations, mockAnswers } = generateAssistantOutput(engineInput);

  // Partition recommendations by category
  const irrigationRecs    = recommendations.filter((r) => r.category === "irrigation");
  const fertilizationRecs = recommendations.filter((r) => r.category === "fertilization");
  const riskRecs          = recommendations.filter((r) => r.category === "risk" || r.category === "climate");

  // Partition insights by severity
  const warnInsights = insights.filter((i) => i.severity === "warn" || i.severity === "critical");

  // Parse fertilizer plan
  let fertPlan: FertilizerLineItem[] = [];
  try { if (latestRec?.fertilizerPlan) fertPlan = JSON.parse(latestRec.fertilizerPlan); } catch { /* ignore */ }

  const conf      = latestRec?.confidenceScore ?? 0;
  const confColor = conf >= 80 ? "text-green-600" : conf >= 65 ? "text-amber-600" : "text-red-500";
  const confBar   = conf >= 80 ? "bg-green-500"   : conf >= 65 ? "bg-amber-500"   : "bg-red-500";

  const { tab: rawTab = "genel", q: rawQ } = await searchParams;
  const activeTab = (TABS.some((t) => t.id === rawTab) ? rawTab : "genel") as TabId;
  const activeQ   = rawQ && /^[1-5]$/.test(rawQ) ? rawQ : null;

  return (
    <div className="space-y-4 max-w-4xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/80 mb-1">AI Monitoring Active</p>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-lime-300" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Asistan</h1>
          </div>
          <p className="text-sm text-white/55">
            {field.name}
            {crop ? ` · ${crop.name} (${GROWTH_STAGE_LABELS[crop.growthStage as GrowthStage]})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeAlarmCount > 0 && (
            <Link
              href="/dashboard/farmer/notifications?filter=unread"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            >
              <TriangleAlert size={12} />
              {activeAlarmCount} aktif alarm
            </Link>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${
            isAuto ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600"
          }`}>
            {isAuto ? <Brain size={12} /> : <Sliders size={12} />}
            {isAuto ? "AI Otomasyonu" : "Manuel Mod"}
          </span>
          {sensor && (() => {
            const meta = SENSOR_SOURCE_META[sensor.source];
            return (
              <span
                title={sensor.deviceId ? `Cihaz: ${sensor.deviceId}` : undefined}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${meta.tone}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.short}
              </span>
            );
          })()}
          {sensor && <LiveStatus lastUpdatedAt={sensor.createdAt.toISOString()} />}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pt-1 pb-2 bg-black/40 backdrop-blur-md border-b border-white/[0.07]">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`?tab=${t.id}`}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Genel Özet
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "genel" && (
        <div className="space-y-5">

          {/* Sera Durumu */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Sera Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Alan</p>
                  <p className="font-semibold text-gray-900">{field.name}</p>
                  {crop && <p className="text-xs text-gray-500 mt-0.5">{crop.name}</p>}
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Büyüme Evresi</p>
                  <p className="font-semibold text-gray-900">
                    {crop ? GROWTH_STAGE_LABELS[crop.growthStage as GrowthStage] : "—"}
                  </p>
                  {crop?.plantCount && <p className="text-xs text-gray-500 mt-0.5">{crop.plantCount.toLocaleString("tr-TR")} bitki</p>}
                </div>
                {[
                  { label: "Sıcaklık",    icon: Thermometer, value: sensor?.temperature  != null ? `${sensor.temperature.toFixed(1)} °C`       : "—", color: "text-orange-500" },
                  { label: "Nem",         icon: Droplets,    value: sensor?.humidity     != null ? `%${sensor.humidity.toFixed(0)}`              : "—", color: "text-blue-500"   },
                  { label: "pH",          icon: Gauge,       value: sensor?.ph           != null ? sensor.ph.toFixed(1)                          : "—", color: "text-amber-500"  },
                  { label: "EC",          icon: Zap,         value: sensor?.ec           != null ? `${sensor.ec.toFixed(1)} dS/m`                : "—", color: "text-purple-500" },
                  { label: "Toprak Nemi", icon: Sprout,      value: sensor?.soilMoisture != null ? `%${sensor.soilMoisture.toFixed(0)}`           : "—", color: "text-green-600"  },
                  { label: "Işık",        icon: Sun,         value: sensor?.lightLevel   != null ? `${(sensor.lightLevel/1000).toFixed(0)} klux`  : "—", color: "text-yellow-500" },
                ].map(({ label, icon: Icon, value, color }) => (
                  <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Icon size={11} className={color} />{label}
                    </div>
                    <p className={`text-base font-bold ${color}`}>{value}</p>
                  </div>
                ))}
                <div className={`p-3 rounded-xl border ${isAuto ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}>
                  <p className="text-xs text-gray-400 mb-1">Otomasyon</p>
                  <div className="flex items-center gap-1.5">
                    {isAuto ? <Brain size={13} className="text-green-600" /> : <Sliders size={13} className="text-gray-500" />}
                    <p className={`font-semibold text-sm ${isAuto ? "text-green-700" : "text-gray-700"}`}>
                      {isAuto ? "AI Aktif" : "Manuel"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dış Koşullar */}
          {weatherReading && (
            <Card className="border-sky-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base font-semibold">Dış Koşullar</CardTitle>
                  {(() => {
                    const meta = WEATHER_SOURCE_META[weatherReading.source];
                    return (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.tone}`}>
                        {meta.short}
                        {weatherReading.provider && <span className="opacity-70">· {weatherReading.provider}</span>}
                      </span>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-3">
                  {[
                    { emoji: "🌡️", label: "Dış Sıcaklık", value: weatherReading.outsideTemperature != null ? `${weatherReading.outsideTemperature.toFixed(1)} °C` : "—" },
                    { emoji: "💧", label: "Dış Nem",       value: weatherReading.outsideHumidity    != null ? `%${weatherReading.outsideHumidity.toFixed(0)}`    : "—" },
                    { emoji: "🌧️", label: "Yağmur",        value: weatherReading.rainChance         != null ? `%${weatherReading.rainChance.toFixed(0)}`          : "—" },
                    { emoji: "💨", label: "Rüzgar",        value: weatherReading.windSpeed          != null ? `${weatherReading.windSpeed.toFixed(0)} km/h`       : "—" },
                    { emoji: "☀️", label: "Güneş Rad.",    value: weatherReading.solarRadiation     != null ? `${weatherReading.solarRadiation.toFixed(0)} W/m²`  : "—" },
                  ].map(({ emoji, label, value }) => (
                    <div key={label} className="p-3 rounded-xl bg-sky-50/50 border border-sky-100">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <span className="text-sm">{emoji}</span>{label}
                      </div>
                      <p className="font-bold text-sky-700">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <span className="font-medium text-gray-700">AI Hava Yorumu: </span>
                  {(weatherReading.rainChance ?? 0) > 60
                    ? `Yağmur ihtimali %${weatherReading.rainChance?.toFixed(0)} — sulama sistemini yavaşlatın, sera nemi artabilir.`
                    : (weatherReading.windSpeed ?? 0) > 35
                    ? `Rüzgar ${weatherReading.windSpeed?.toFixed(0)} km/h — havalandırma açıkken basınç dalgalanmasına dikkat edin.`
                    : (weatherReading.solarRadiation ?? 999) < 200
                    ? `Güneş radyasyonu ${weatherReading.solarRadiation?.toFixed(0)} W/m² ile düşük — yapay aydınlatma öncelikli.`
                    : (weatherReading.outsideTemperature ?? 0) > 30
                    ? `Dış sıcaklık ${weatherReading.outsideTemperature?.toFixed(1)}°C — sera soğutma kapasitesi baskı altında, erken havalandırma açın.`
                    : "Dış koşullar uygun — sera yönetiminde ekstra önlem gerekmiyor."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Değerlendirme */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Değerlendirme</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((ins) => <InsightCard key={ins.id} ins={ins} />)}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Sulama
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "sulama" && (
        <div className="space-y-5">

          {/* Sensor metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Toprak Nemi",    icon: Sprout,   value: sensor?.soilMoisture != null ? `%${sensor.soilMoisture.toFixed(0)}` : "—",  color: "text-green-600",  status: sensor?.soilMoisture != null && sensor.soilMoisture < 55 ? "warn" : "ok" },
              { label: "Nem",            icon: Droplets, value: sensor?.humidity     != null ? `%${sensor.humidity.toFixed(0)}`      : "—",  color: "text-blue-500",   status: "ok" as const },
              { label: "Yağmur İhtimali",icon: CloudSun, value: weatherReading?.rainChance != null ? `%${weatherReading.rainChance.toFixed(0)}` : "—", color: "text-indigo-500", status: (weatherReading?.rainChance ?? 0) > 60 ? "warn" : "ok" as const },
            ].map(({ label, icon: Icon, value, color, status }) => (
              <div key={label} className="flex flex-col gap-1 p-4 rounded-xl border border-gray-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Icon size={13} className={`${color} opacity-70`} />{label}
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                {status && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit ${status === "ok" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {status === "ok" ? "Normal" : "Dikkat"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Sulama reçetesi */}
          {latestRec && (latestRec.irrigationLitersPerPlant || latestRec.irrigationFrequency) && (
            <Card className="border-blue-100 bg-blue-50/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100"><Droplets size={14} className="text-blue-700" /></div>
                  <CardTitle className="text-base">Sulama Önerisi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {latestRec.irrigationLitersPerPlant && (
                    <div className="p-3 rounded-xl bg-white border border-blue-100">
                      <p className="text-xs text-gray-400 mb-1">Sulama Dozu</p>
                      <p className="text-xl font-bold text-blue-700">{latestRec.irrigationLitersPerPlant.toFixed(1)} <span className="text-sm font-normal">L/bitki</span></p>
                    </div>
                  )}
                  {latestRec.irrigationFrequency && (
                    <div className="p-3 rounded-xl bg-white border border-blue-100">
                      <p className="text-xs text-gray-400 mb-1">Sıklık</p>
                      <p className="text-sm font-semibold text-blue-700 leading-snug">{latestRec.irrigationFrequency}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Link href={`/dashboard/farmer/recommendations/${latestRec.id}`} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium">
                    Tam reçeteyi görüntüle <ChevronRight size={12} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sulama AI önerileri */}
          {irrigationRecs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Sulama Önerileri</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {irrigationRecs.map((rec) => <RecCard key={rec.id} rec={rec} />)}
              </div>
            </div>
          )}

          {irrigationRecs.length === 0 && !latestRec && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200/30 bg-emerald-500/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-sm text-emerald-200/80">Sulama sistemi normal çalışıyor, ek öneri gerekmiyor.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Fertigation
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fertigation" && (
        <div className="space-y-5">

          {/* pH / EC metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Sensör pH",    icon: Gauge, value: sensor?.ph != null ? sensor.ph.toFixed(1) : "—",          color: "text-amber-500",  status: sensor?.ph != null && (sensor.ph < 5.5 || sensor.ph > 7.5) ? "warn" : "ok" },
              { label: "Sensör EC",    icon: Zap,   value: sensor?.ec != null ? `${sensor.ec.toFixed(1)} dS/m` : "—", color: "text-purple-500", status: sensor?.ec != null && sensor.ec > 3.5 ? "warn" : "ok" },
              { label: "Hedef pH",     icon: Gauge, value: latestRec?.targetPh ?? "—",                               color: "text-amber-400",  status: undefined },
              { label: "Hedef EC",     icon: Zap,   value: latestRec?.targetEc ?? "—",                               color: "text-purple-400", status: undefined },
            ].map(({ label, icon: Icon, value, color, status }) => (
              <div key={label} className="flex flex-col gap-1 p-4 rounded-xl border border-gray-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Icon size={13} className={`${color} opacity-70`} />{label}
                </div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                {status && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit ${status === "ok" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {status === "ok" ? "Normal" : "Dikkat"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Bugün Uygulanacak Reçete */}
          {latestRec && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-100"><FlaskConical size={14} className="text-green-700" /></div>
                    <div>
                      <CardTitle className="text-base">{latestRec.title}</CardTitle>
                      {latestRec.estimatedCost && (
                        <p className="text-xs text-gray-500 mt-0.5">Tahmini maliyet: <span className="font-medium">{latestRec.estimatedCost}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold ${confColor}`}>%{conf.toFixed(0)}</p>
                    <p className="text-xs text-gray-400">güven</p>
                  </div>
                </div>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${confBar}`} style={{ width: `${conf}%` }} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Azot (N)", value: latestRec.nitrogenAdvice, color: "border-green-200 bg-white" },
                    { label: "Fosfor (P)", value: latestRec.phosphorusAdvice, color: "border-purple-200 bg-white" },
                    { label: "Potasyum (K)", value: latestRec.potassiumAdvice, color: "border-amber-200 bg-white" },
                  ].map(({ label, value, color }) => value && (
                    <div key={label} className={`p-3 rounded-xl border ${color}`}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="text-xs font-medium text-gray-800 leading-snug">{value}</p>
                    </div>
                  ))}
                </div>
                {fertPlan.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Ürün</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Doz</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Sıklık</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fertPlan.map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-medium text-gray-800">{item.product}</td>
                            <td className="px-3 py-2 text-gray-600">{item.dose}</td>
                            <td className="px-3 py-2 text-gray-600">{item.frequency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end">
                  <Link href={`/dashboard/farmer/recommendations/${latestRec.id}`} className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium">
                    Tam reçeteyi görüntüle <ChevronRight size={12} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gübreleme AI önerileri */}
          {fertilizationRecs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Gübreleme Önerileri</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fertilizationRecs.map((rec) => <RecCard key={rec.id} rec={rec} />)}
              </div>
            </div>
          )}

          {!latestRec && fertilizationRecs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-white/10 rounded-xl">
              <FlaskConical size={32} className="text-white/20 mb-3" />
              <p className="text-white/50 text-sm font-medium">Henüz onaylı reçete yok.</p>
              <Link href="/dashboard/farmer/analyses/new" className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                Yeni analiz oluştur →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: Risk Analizi
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "risk" && (
        <div className="space-y-5">

          {/* Alarm banner */}
          {activeAlarmCount > 0 && (
            <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-red-200/40 bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10 shrink-0"><BellRing size={16} className="text-red-400" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">{activeAlarmCount} okunmamış kritik alarm</p>
                  <p className="text-xs text-white/50 mt-0.5">Hemen kontrol edin.</p>
                </div>
              </div>
              <Link href="/dashboard/farmer/notifications?filter=unread" className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 shrink-0">
                Alarmlar <ChevronRight size={11} />
              </Link>
            </div>
          )}

          {/* Sıcaklık + genel risk metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Sıcaklık",    icon: Thermometer, value: sensor?.temperature != null ? `${sensor.temperature.toFixed(1)} °C` : "—", color: "text-orange-500", warn: (sensor?.temperature ?? 0) > 27 },
              { label: "Nem",         icon: Droplets,    value: sensor?.humidity    != null ? `%${sensor.humidity.toFixed(0)}`        : "—", color: "text-blue-500",   warn: (sensor?.humidity ?? 0) > 85 },
              { label: "pH",          icon: Gauge,       value: sensor?.ph          != null ? sensor.ph.toFixed(1)                    : "—", color: "text-amber-500",  warn: sensor?.ph != null && (sensor.ph < 5.5 || sensor.ph > 7.5) },
              { label: "EC",          icon: Zap,         value: sensor?.ec          != null ? `${sensor.ec.toFixed(1)} dS/m`          : "—", color: "text-purple-500", warn: (sensor?.ec ?? 0) > 3.5 },
              { label: "Rüzgar",      icon: CloudSun,    value: weatherReading?.windSpeed != null ? `${weatherReading.windSpeed.toFixed(0)} km/h` : "—", color: "text-teal-500", warn: (weatherReading?.windSpeed ?? 0) > 35 },
              { label: "Yağmur",      icon: CloudSun,    value: weatherReading?.rainChance != null ? `%${weatherReading.rainChance.toFixed(0)}` : "—", color: "text-indigo-500", warn: (weatherReading?.rainChance ?? 0) > 60 },
            ].map(({ label, icon: Icon, value, color, warn }) => (
              <div key={label} className={`flex flex-col gap-1 p-4 rounded-xl border ${warn ? "border-amber-200 bg-amber-50/20" : "border-gray-100 bg-white"}`}>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Icon size={13} className={`${color} opacity-70`} />{label}
                </div>
                <p className={`text-xl font-bold ${warn ? "text-amber-500" : color}`}>{value}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit ${warn ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {warn ? "⚠ Risk" : "Normal"}
                </span>
              </div>
            ))}
          </div>

          {/* Risk özeti */}
          {latestRec?.riskSummary && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200/30 bg-amber-500/5">
              <ShieldAlert size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300 mb-1">Reçete Risk Özeti</p>
                <p className="text-sm text-white/70 leading-relaxed">{latestRec.riskSummary}</p>
              </div>
            </div>
          )}

          {/* Warn/critical insights */}
          {warnInsights.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Aktif Uyarılar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {warnInsights.map((ins) => <InsightCard key={ins.id} ins={ins} />)}
              </div>
            </div>
          )}

          {/* Risk + climate recs */}
          {riskRecs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">İklim &amp; Risk Önerileri</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {riskRecs.map((rec) => <RecCard key={rec.id} rec={rec} />)}
              </div>
            </div>
          )}

          {warnInsights.length === 0 && riskRecs.length === 0 && activeAlarmCount === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200/30 bg-emerald-500/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-sm text-emerald-200/80">Aktif risk veya uyarı bulunmuyor. Tüm sistemler normal.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: AI Chat
         ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "chat" && (() => {
        const answer = activeQ
          ? buildChatAnswer(activeQ, sensor, latestRec, weatherReading, activeAlarmCount, fertPlan, crop?.name ?? null)
          : null;

        const severityStyles = {
          ok:       { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25", dot: "bg-emerald-400", label: "Normal"  },
          warn:     { badge: "bg-amber-500/15  text-amber-300  border-amber-400/25",    dot: "bg-amber-400",   label: "Dikkat"  },
          critical: { badge: "bg-red-500/15    text-red-300    border-red-400/25",      dot: "bg-red-400",     label: "Kritik"  },
          info:     { badge: "bg-blue-500/15   text-blue-300   border-blue-400/25",     dot: "bg-blue-400",    label: "Bilgi"   },
        };
        const sStyle = answer ? severityStyles[answer.severity] : null;

        return (
          <div className="space-y-4">

            {/* Mode badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">
                <Sparkles size={10} /> Decision Support Mode
              </span>
              <span className="text-xs text-white/30">Sensör verilerine dayalı deterministik yanıtlar</span>
            </div>

            {/* Chat window */}
            <div className="min-h-[300px] rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm flex flex-col">
              {!activeQ ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
                    <MessageCircle size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white/60 font-medium">Aşağıdan bir soru seçin</p>
                    <p className="text-white/25 text-xs mt-1">{field.name} · {sensor ? "sensör verisi aktif" : "demo modu"}</p>
                  </div>
                </div>
              ) : (
                /* Conversation */
                <div className="flex flex-col gap-4 p-4">
                  {/* User message — right */}
                  <div className="flex justify-end">
                    <div className="max-w-xs sm:max-w-sm bg-emerald-600/60 border border-emerald-500/30 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed">
                      {CHAT_QUESTIONS.find((q) => q.id === activeQ)?.label}
                    </div>
                  </div>

                  {/* AI message — left */}
                  {answer && sStyle && (
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={13} className="text-emerald-400" />
                      </div>
                      {/* Bubble */}
                      <div className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3">
                        {/* Bubble header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-emerald-300">Seranova</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sStyle.badge}`}>
                            <span className={`w-1 h-1 rounded-full ${sStyle.dot}`} />
                            {sStyle.label}
                          </span>
                        </div>
                        {/* Paragraphs */}
                        {answer.paragraphs.map((p, i) => (
                          <p key={i} className="text-sm text-white/80 leading-relaxed mb-2">{p}</p>
                        ))}
                        {/* Bullets */}
                        {answer.bullets.length > 0 && (
                          <ul className="mt-1 space-y-1.5">
                            {answer.bullets.map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${sStyle.dot}`} />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Action */}
                        {answer.action && (
                          <p className="text-xs text-emerald-300/80 mt-3 pt-2.5 border-t border-white/[0.06]">
                            → {answer.action}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Question chips */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Hazır Sorular</p>
              <div className="flex flex-wrap gap-2">
                {CHAT_QUESTIONS.map((q) => (
                  <Link
                    key={q.id}
                    href={`?tab=chat&q=${q.id}`}
                    className={`text-sm px-3.5 py-2 rounded-xl border transition-colors ${
                      activeQ === q.id
                        ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
                        : "border-white/10 text-white/55 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legacy MockChat (collapsed) */}
            <details className="group">
              <summary className="text-xs text-white/25 hover:text-white/40 cursor-pointer select-none list-none flex items-center gap-1.5 transition-colors">
                <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                Eski soru-cevap listesi
              </summary>
              <div className="mt-3">
                <Card>
                  <CardContent className="p-4">
                    <MockChat answers={mockAnswers} />
                  </CardContent>
                </Card>
              </div>
            </details>

            <p className="text-[10px] text-white/20 text-center">
              Yanıtlar sensör ve analiz verilerine dayalı deterministik algoritmalar · POST /api/iot/sensor-readings ile gerçek cihaz bağlanabilir
            </p>
          </div>
        );
      })()}

      <p className="text-xs text-gray-400 text-center">
        Seranova AI Asistan · Yanıtlar sensör ve analiz verilerine dayalı deterministik algoritmalar tarafından üretilmektedir.
      </p>
    </div>
  );
}
