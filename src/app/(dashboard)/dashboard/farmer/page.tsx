import { Sprout, FlaskConical, Leaf, TrendingUp, Sparkles, ArrowRight, Activity, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import StatsCard from "@/components/dashboard/StatsCard";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import type { NotificationItem } from "@/components/dashboard/NotificationCenter";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GROWTH_STAGE_LABELS } from "@/lib/recommendation-engine";
import type { GrowthStage } from "@/lib/recommendation-engine";
import { generateAssistantOutput } from "@/lib/ai-assistant-engine";

const ANALYSIS_STATUS_LABELS: Record<string, string> = {
  DRAFT:     "Taslak",
  SUBMITTED: "Gönderildi",
  REVIEWED:  "İncelendi",
};

const STAGE_COLORS: Record<GrowthStage, string> = {
  SEEDLING:   "bg-lime-100 text-lime-700",
  VEGETATIVE: "bg-green-100 text-green-700",
  FLOWERING:  "bg-purple-100 text-purple-700",
  FRUITING:   "bg-orange-100 text-orange-700",
  HARVEST:    "bg-yellow-100 text-yellow-700",
};

const SYSTEM_STATUS = [
  { label: "Sulama",         status: "AI Kontrolde", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { label: "Havalandırma",   status: "Aktif",         badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { label: "Aydınlatma",     status: "Pasif",         badge: "bg-slate-500/20 text-slate-400 border-slate-500/20"       },
  { label: "Otomasyon Modu", status: "AI Control",   badge: "bg-lime-400/20 text-lime-300 border-lime-400/30"           },
] as const;

const AI_DECISIONS = [
  { trigger: "Toprak nemi düşük algılandı",   action: "Sulama önerildi",                  time: "2dk önce"  },
  { trigger: "Sıcaklık eşik değere yaklaştı", action: "Havalandırma aktif tutuluyor",      time: "8dk önce"  },
  { trigger: "EC dengeli",                    action: "Gübreleme planı korunuyor",          time: "15dk önce" },
  { trigger: "Sistem simülasyon modunda",     action: "Canlı izleme yapılıyor",            time: "Sürekli"   },
] as const;

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function fmtShort(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(d);
}

const TABS = [
  { id: "genel",       label: "Genel Bakış"  },
  { id: "aksiyonlar",  label: "Aksiyonlar"   },
  { id: "ai",          label: "AI Özet"      },
  { id: "uyarilar",    label: "Uyarılar"     },
  { id: "fertigation", label: "Fertigation"  },
] as const;

type TabId = typeof TABS[number]["id"];

export default async function FarmerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const [fieldCount, areaAgg, analysisCount, recCount, recentAnalyses, activeCrops, latestSensor, latestWeather, notifications, unreadCount, latestRec] =
    await Promise.all([
      prisma.field.count({ where: { userId } }),
      prisma.field.aggregate({ _sum: { areaHectares: true }, where: { userId } }),
      prisma.soilAnalysis.count({ where: { field: { userId } } }),
      prisma.recommendation.count({
        where: { farmerId: userId, status: { in: ["SUBMITTED", "APPROVED"] } },
      }),
      prisma.soilAnalysis.findMany({
        where: { field: { userId } },
        include: { field: { include: { crops: { take: 1 } } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.crop.findMany({
        where: { field: { userId } },
        include: { field: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.sensorReading.findFirst({
        where: { field: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.weatherReading.findFirst({
        where: { field: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.recommendation.findFirst({
        where: { farmerId: userId },
        orderBy: { createdAt: "desc" },
        select: {
          id:                 true,
          title:              true,
          targetPh:           true,
          targetEc:           true,
          irrigationFrequency: true,
          confidenceScore:    true,
          estimatedCost:      true,
          createdAt:          true,
        },
      }),
    ]);

  const notificationItems: NotificationItem[] = notifications.map((n) => ({
    id:                      n.id,
    title:                   n.title,
    message:                 n.message,
    type:                    n.type,
    severity:                n.severity,
    source:                  n.source,
    isRead:                  n.isRead,
    relatedFieldId:          n.relatedFieldId,
    relatedAnalysisId:       n.relatedAnalysisId,
    relatedRecommendationId: n.relatedRecommendationId,
    createdAt:               n.createdAt.toISOString(),
  }));

  const totalAreaM2 = Math.round((areaAgg._sum.areaHectares ?? 0) * 10000);

  const latestSoil = recentAnalyses[0] ?? null;
  const latestCrop = activeCrops[0] ?? null;

  let healthScore = 60;
  if (latestSensor) {
    const temp = latestSensor.temperature ?? 0;
    const hum  = latestSensor.humidity    ?? 0;
    const mois = latestSensor.soilMoisture ?? 0;
    if (temp >= 18 && temp <= 28) healthScore += 8; else if (temp > 0) healthScore -= 5;
    if (hum  >= 55 && hum  <= 80) healthScore += 7;
    if (mois >= 40 && mois <= 70) healthScore += 7;
  }
  if (latestSoil) {
    const ph = latestSoil.ph ?? 0;
    if (ph >= 6.0 && ph <= 7.0) healthScore += 8;
    if ((latestSoil.ec ?? 99) < 3.0) healthScore += 5;
  }
  if (analysisCount > 0) healthScore += 5;
  healthScore = Math.min(100, Math.max(0, healthScore));

  const deviceIrrigation  = latestSensor?.irrigationOn  ?? null;
  const deviceVentilation = latestSensor?.ventilationOn ?? null;
  const deviceLighting    = latestSensor?.lightLevel != null ? latestSensor.lightLevel > 0 : null;

  const scoreLabel = healthScore >= 80 ? "İyi" : healthScore >= 60 ? "Orta" : "Dikkat";
  const scoreColor = healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-yellow-600" : "text-red-600";
  const scoreBg    = healthScore >= 80 ? "bg-green-50 border-green-200" : healthScore >= 60 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const scoreBar   = healthScore >= 80 ? "bg-green-500" : healthScore >= 60 ? "bg-yellow-400" : "bg-red-400";
  const { topInsight } = generateAssistantOutput({
    sensor: latestSensor
      ? {
          temperature:   latestSensor.temperature,
          humidity:      latestSensor.humidity,
          ph:            latestSensor.ph,
          ec:            latestSensor.ec,
          lightLevel:    latestSensor.lightLevel,
          soilMoisture:  latestSensor.soilMoisture,
          irrigationOn:  latestSensor.irrigationOn,
          ventilationOn: latestSensor.ventilationOn,
        }
      : null,
    soil: latestSoil
      ? {
          ph:            latestSoil.ph,
          ec:            latestSoil.ec,
          nitrogen:      latestSoil.nitrogen,
          phosphorus:    latestSoil.phosphorus,
          potassium:     latestSoil.potassium,
          organicMatter: latestSoil.organicMatter,
        }
      : null,
    water: null,
    weather: latestWeather
      ? {
          outsideTemperature: latestWeather.outsideTemperature,
          outsideHumidity:    latestWeather.outsideHumidity,
          rainChance:         latestWeather.rainChance,
          windSpeed:          latestWeather.windSpeed,
          solarRadiation:     latestWeather.solarRadiation,
          condition:          latestWeather.condition,
        }
      : null,
    crop: latestCrop
      ? {
          name:            latestCrop.name,
          growthStage:     latestCrop.growthStage,
          plantedAt:       latestCrop.plantedAt,
          expectedHarvest: latestCrop.expectedHarvest,
          plantCount:      latestCrop.plantCount,
        }
      : null,
    automationMode: "AUTO",
    warningCount: 0,
  });

  const { tab: rawTab = "genel" } = await searchParams;
  const activeTab = (TABS.some((t) => t.id === rawTab) ? rawTab : "genel") as TabId;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/80 mb-1">Greenhouse Control Room</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/55 mt-1">
          Sezon: İlkbahar 2026 · <span className="text-white/80">{session!.user.name}</span>
        </p>
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

      {/* ── Genel Bakış ─────────────────────────────────────────────────────── */}
      {activeTab === "genel" && (
        <div className="space-y-4">
          <Card className={`border ${scoreBg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-6">
                <div className="shrink-0">
                  <p className="text-xs text-gray-500 mb-0.5">Sera Sağlık Skoru</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${scoreColor}`}>{healthScore}</span>
                    <span className={`text-sm font-medium ${scoreColor}`}>/ 100 · {scoreLabel}</span>
                  </div>
                </div>
                <div className="flex-1 max-w-sm">
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${scoreBar}`} style={{ width: `${healthScore}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {latestSensor ? "Sensör verisi var" : "Sensör verisi yok"} ·{" "}
                    {latestSoil   ? "Toprak analizi var" : "Toprak analizi yok"} ·{" "}
                    {analysisCount} analiz
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Aktif Sera / Alan" value={fieldCount}
              subtitle={totalAreaM2 > 0 ? `toplam alan: ${totalAreaM2.toLocaleString("tr-TR")} m²` : "sera kaydı yok"}
              icon={Sprout} color="green" />
            <StatsCard title="Toplam Analiz" value={analysisCount} subtitle="tüm zamanlar" icon={FlaskConical} color="blue" />
            <StatsCard title="Aktif Öneri" value={recCount} subtitle="onaylandı / incelemede" icon={Leaf} color="amber" />
            <StatsCard title="Verim Artışı" value="%—" subtitle="henüz hesaplanamadı" icon={TrendingUp} color="rose" />
          </div>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white/90">Cihaz Durumu</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!latestSensor ? (
                <p className="text-sm text-white/40 py-2">Sensör verisi yok.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {([ { label: "Sulama", state: deviceIrrigation }, { label: "Havalandırma", state: deviceVentilation }, { label: "Aydınlatma", state: deviceLighting } ] as { label: string; state: boolean | null }[]).map(({ label, state }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-white/5 border-white/10">
                      <span className="text-sm text-white/80">{label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${state === null ? "bg-white/10 text-white/40 border-white/10" : state ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/20"}`}>
                        {state === null ? "Veri yok" : state ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
                    <span className="text-sm text-white/80">Otomasyon</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-400/25 text-emerald-200 border-emerald-400/40">AI Kontrolde</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {latestWeather && (
            <Card className="border-sky-100">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">
                      {latestWeather.condition === "SUNNY" ? "☀️" : latestWeather.condition === "CLOUDY" ? "🌤️" : latestWeather.condition === "RAINY" ? "🌧️" : latestWeather.condition === "WINDY" ? "💨" : "⛈️"}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Dış Hava Koşulları</p>
                      <p className="text-xs text-gray-500">
                        {latestWeather.outsideTemperature?.toFixed(1) ?? "—"}°C · Yağmur %{latestWeather.rainChance?.toFixed(0) ?? "—"} · Rüzgar {latestWeather.windSpeed?.toFixed(0) ?? "—"} km/h · Radyasyon {latestWeather.solarRadiation?.toFixed(0) ?? "—"} W/m²
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 max-w-xs">
                    {(latestWeather.rainChance ?? 0) > 60 ? "Yağmur bekleniyor — sulama dozunu azaltın."
                      : (latestWeather.windSpeed ?? 0) > 35 ? "Güçlü rüzgar — havalandırmayı kademeli açın."
                      : (latestWeather.solarRadiation ?? 999) < 200 ? "Düşük güneş radyasyonu — yapay aydınlatmayı değerlendirin."
                      : (latestWeather.outsideTemperature ?? 0) > 30 ? "Yüksek dış sıcaklık — havalandırmayı erken açın."
                      : "Dış koşullar sera yönetimini olumsuz etkilemiyor."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeCrops.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-semibold">Ürün Büyüme Durumu</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeCrops.map((crop) => {
                    const stage = crop.growthStage as GrowthStage;
                    const stageColor = STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-600";
                    return (
                      <div key={crop.id} className="flex flex-col gap-1.5 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{crop.name}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageColor}`}>{GROWTH_STAGE_LABELS[stage]}</span>
                        </div>
                        <p className="text-xs text-gray-400">{crop.field.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {crop.plantedAt && <span>Dikim: {fmtShort(crop.plantedAt)}</span>}
                          {crop.expectedHarvest && <span>Hasat: {fmtShort(crop.expectedHarvest)}</span>}
                          {crop.plantCount && <span>{crop.plantCount.toLocaleString("tr-TR")} bitki</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Control Room: System Status + AI Decision Feed ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* System Status */}
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white/90 flex items-center gap-2">
                  <Activity size={15} className="text-emerald-400" />
                  Sistem Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  {SYSTEM_STATUS.map(({ label, status, badge }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-white/5 border-white/10">
                      <span className="text-sm text-white/70">{label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Decision Feed */}
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white/90 flex items-center gap-2">
                  <Zap size={15} className="text-lime-300" />
                  AI Karar Akışı
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {AI_DECISIONS.map(({ trigger, action, time }) => (
                  <div key={trigger} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border bg-white/5 border-white/10">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/50 leading-none mb-0.5">{trigger}</p>
                      <p className="text-sm text-white/85 font-medium leading-snug">{action}</p>
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0 mt-0.5 whitespace-nowrap">{time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Aksiyonlar ───────────────────────────────────────────────────────── */}
      {activeTab === "aksiyonlar" && (
        <div className="space-y-4">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-white/90">Bugün Yapılacaklar</CardTitle></CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[{ icon: "💧", text: "Sulama öneriliyor" }, { icon: "🌬️", text: "Havalandırmayı kontrol et" }, { icon: "🌿", text: "Gübreleme planını incele" }].map((item) => (
                <div key={item.text} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="text-sm text-white/80">{item.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-white/90">Hızlı Aksiyonlar</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { href: "/dashboard/farmer/analyses/new",  label: "Yeni Analiz Oluştur", desc: "Toprak verisini kaydet"      },
                  { href: "/dashboard/farmer/ai-assistant",  label: "AI Assistant'a Git",   desc: "Akıllı öneriler al"          },
                  { href: "/dashboard/farmer/reports",       label: "Raporları Gör",        desc: "Dönem özetlerini incele"     },
                  { href: "/dashboard/farmer/notifications", label: "Bildirimleri Gör",     desc: "Uyarı ve haberleri takip et" },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-colors group">
                    <span className="text-sm font-medium text-white/85 group-hover:text-white leading-snug">{item.label}</span>
                    <span className="text-xs text-white/40">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Hızlı İşlemler</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { href: "/dashboard/farmer/analyses/new",      label: "Yeni Toprak Analizi Gir", desc: "pH, NPK ve diğer değerleri gir" },
                { href: "/dashboard/farmer/fields",            label: "Sera Ekle / Düzenle",      desc: "Mevcut seralarını yönet"        },
                { href: "/dashboard/farmer/recommendations",   label: "Gübre Önerilerini Gör",    desc: "Son önerilen dozları incele"    },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-green-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-green-500 text-lg">→</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── AI Özet ──────────────────────────────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-white/90">AI Günlük Özet</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-sm text-white/70 leading-relaxed">
                Bugünkü sera koşulları genel olarak dengeli. Toprak nemi takip edilmeli, sıcaklık yükselirse
                havalandırma aktif tutulmalı. Gübreleme planı uygulanmadan önce son analiz değerleri kontrol edilmeli.
              </p>
              <div className="flex flex-wrap gap-2">
                {["AI İzleme Aktif", "Simülasyon Modu", "Karar Destek Sistemi"].map((label) => (
                  <span key={label} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">{label}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {topInsight && (
            <Card className="border-green-100 bg-green-50/30">
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 shrink-0"><Sparkles size={16} className="text-green-700" /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">AI Asistan Özeti</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{topInsight.body}</p>
                  </div>
                </div>
                <Link href="/dashboard/farmer/ai-assistant" className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0">
                  AI Asistan <ArrowRight size={12} />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Uyarılar ─────────────────────────────────────────────────────────── */}
      {activeTab === "uyarilar" && (
        <div className="space-y-4">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-white/90">Kritik Uyarılar</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {(() => {
                const alerts = notificationItems.filter((n) => n.severity === "WARNING" || n.severity === "CRITICAL").slice(0, 3);
                if (alerts.length === 0) return <p className="text-sm text-white/50 py-1">Kritik uyarı yok. Sera koşulları izleniyor.</p>;
                return (
                  <div className="space-y-2">
                    {alerts.map((n) => (
                      <div key={n.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${n.severity === "CRITICAL" ? "bg-red-500/10 border-red-500/25" : "bg-amber-500/10 border-amber-500/25"}`}>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${n.severity === "CRITICAL" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                          {n.severity === "CRITICAL" ? "Kritik" : "Uyarı"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-white/85 font-medium leading-snug">{n.title}</p>
                          <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <NotificationCenter notifications={notificationItems} unreadCount={unreadCount} />
        </div>
      )}

      {/* ── Fertigation ──────────────────────────────────────────────────────── */}
      {activeTab === "fertigation" && (
        <div className="space-y-4">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white/90">Son Fertigation Planı</CardTitle>
              {latestRec && <span className="text-[10px] text-white/40">{fmtDate(latestRec.createdAt)}</span>}
            </CardHeader>
            <CardContent className="pt-0">
              {!latestRec || (!latestRec.targetPh && !latestRec.targetEc && !latestRec.irrigationFrequency) ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/50">Henüz fertigation planı yok. Yeni analiz oluşturduğunuzda burada görünecek.</p>
                  <Link href="/dashboard/farmer/analyses/new" className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-300 bg-lime-400/10 hover:bg-lime-400/20 border border-lime-400/20 px-3 py-1.5 rounded-lg transition-colors">
                    Yeni Analiz Oluştur <ArrowRight size={12} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Hedef pH",       value: latestRec.targetPh            ?? "—" },
                      { label: "Hedef EC",        value: latestRec.targetEc            ?? "—" },
                      { label: "Sulama Sıklığı",  value: latestRec.irrigationFrequency ?? "—" },
                      { label: "Güven Skoru",     value: latestRec.confidenceScore != null ? `%${Math.round(latestRec.confidenceScore * 100)}` : "—" },
                      { label: "Tahmini Maliyet", value: latestRec.estimatedCost       ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-[10px] text-white/40 mb-0.5">{label}</p>
                        <p className="text-sm font-medium text-white/85">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Link href={`/dashboard/farmer/recommendations/${latestRec.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 px-3 py-1.5 rounded-lg transition-colors">
                    Detayı Gör <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Son Analizler</CardTitle></CardHeader>
            <CardContent>
              {recentAnalyses.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Henüz analiz kaydı yok.</p>
              ) : (
                <div className="space-y-3">
                  {recentAnalyses.map((a) => {
                    const cropName = a.field.crops[0]?.name ?? "—";
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.field.name}{cropName !== "—" ? ` - ${cropName}` : ""}</p>
                          <p className="text-xs text-gray-400">{fmtDate(a.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {cropName !== "—" && <Badge variant="outline" className="text-xs">{cropName}</Badge>}
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">{ANALYSIS_STATUS_LABELS[a.status] ?? a.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
