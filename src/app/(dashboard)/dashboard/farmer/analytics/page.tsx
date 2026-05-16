import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TempHumidityChart,
  PhEcChart,
  SoilMoistureChart,
  type SensorDataPoint,
} from "@/components/analytics/SensorChart";
import DeviceControl from "@/components/analytics/DeviceControl";
import LiveStatus from "@/components/analytics/LiveStatus";
import WeatherSyncButton from "@/components/analytics/WeatherSyncButton";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import Link from "next/link";
import { runAutomation } from "@/lib/automation-engine";
import {
  Thermometer, Droplets, Gauge, Zap, Sprout, Sun,
  TriangleAlert, Info, ShieldAlert, Radio, CloudSun,
  BellRing, ArrowRight, FlaskConical,
} from "lucide-react";
import type { Severity } from "@/lib/automation-engine";
import { SENSOR_SOURCE_META, WEATHER_SOURCE_META } from "@/lib/data-source";

// ── Local display types (subset of Prisma models) ────────────────────────────
// Prisma types are supersets, so they satisfy these interfaces directly.

type DisplayReading = {
  temperature:  number | null;
  humidity:     number | null;
  ph:           number | null;
  ec:           number | null;
  lightLevel:   number | null;
  soilMoisture: number | null;
  createdAt:    Date;
  source:       "SIMULATION" | "MANUAL" | "DEVICE_API";
  deviceId:     string | null;
};

type DisplayWeather = {
  outsideTemperature: number | null;
  outsideHumidity:    number | null;
  rainChance:         number | null;
  windSpeed:          number | null;
  solarRadiation:     number | null;
  createdAt:          Date;
  source:             "SIMULATION" | "MANUAL" | "EXTERNAL_API";
  provider:           string | null;
};

type DisplayEvent = {
  id:        string;
  type:      string;
  message:   string;
  severity:  string;
  createdAt: string;
};

// ── Simulation data generators ────────────────────────────────────────────────

function generateSimReadings(): DisplayReading[] {
  const now = new Date();
  const rows: Array<Omit<DisplayReading, "createdAt" | "source" | "deviceId">> = [
    { temperature: 23.2, humidity: 69, ph: 6.1, ec: 2.0, lightLevel: 38000, soilMoisture: 74 },
    { temperature: 24.8, humidity: 71, ph: 6.3, ec: 2.2, lightLevel: 42000, soilMoisture: 70 },
    { temperature: 22.9, humidity: 67, ph: 6.0, ec: 1.9, lightLevel: 35000, soilMoisture: 76 },
    { temperature: 25.3, humidity: 72, ph: 6.4, ec: 2.3, lightLevel: 45000, soilMoisture: 68 },
    { temperature: 23.7, humidity: 70, ph: 6.2, ec: 2.1, lightLevel: 40000, soilMoisture: 73 },
    { temperature: 24.1, humidity: 68, ph: 6.1, ec: 2.0, lightLevel: 37000, soilMoisture: 75 },
    { temperature: 24.5, humidity: 70, ph: 6.3, ec: 2.2, lightLevel: 41000, soilMoisture: 72 },
  ];
  return rows.map((r, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    d.setHours(12, 0, 0, 0);
    return { ...r, createdAt: d, source: "SIMULATION" as const, deviceId: null };
  });
}

function generateSimWeather(): DisplayWeather[] {
  const now = new Date();
  const rows: Array<Omit<DisplayWeather, "createdAt" | "source" | "provider">> = [
    { outsideTemperature: 18.5, outsideHumidity: 58, rainChance: 10, windSpeed: 8,  solarRadiation: 420 },
    { outsideTemperature: 20.2, outsideHumidity: 55, rainChance:  5, windSpeed: 12, solarRadiation: 510 },
    { outsideTemperature: 17.8, outsideHumidity: 62, rainChance: 25, windSpeed: 15, solarRadiation: 320 },
    { outsideTemperature: 21.4, outsideHumidity: 52, rainChance:  5, windSpeed:  9, solarRadiation: 580 },
    { outsideTemperature: 19.6, outsideHumidity: 57, rainChance:  8, windSpeed: 11, solarRadiation: 470 },
    { outsideTemperature: 22.1, outsideHumidity: 50, rainChance:  3, windSpeed:  7, solarRadiation: 560 },
    { outsideTemperature: 20.8, outsideHumidity: 54, rainChance: 12, windSpeed: 10, solarRadiation: 490 },
  ];
  return rows.map((r, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    d.setHours(12, 0, 0, 0);
    return { ...r, createdAt: d, source: "SIMULATION" as const, provider: null };
  });
}

function generateSimEvents(): DisplayEvent[] {
  const now = new Date();
  const defs = [
    { type: "FERTIGATION_APPLIED", message: "Fertigation dozu uygulandı — N:P:K = 150:80:200 g/1000L.",       severity: "INFO"    },
    { type: "IRRIGATION_STOP",     message: "Sulama durduruldu — hedef nem seviyesine ulaşıldı (%75).",        severity: "INFO"    },
    { type: "HUMIDITY_HIGH",       message: "Yüksek nem uyarısı — %72 seviyesi izleniyor, havalandırma açıldı.", severity: "WARNING" },
    { type: "IRRIGATION_START",    message: "Sulama başlatıldı — toprak nemi eşiğin altına düştü (%68).",      severity: "INFO"    },
    { type: "VENTILATION_OPEN",    message: "Havalandırma açıldı — sıcaklık 25°C sınırını aştı.",              severity: "INFO"    },
    { type: "PH_ALERT",            message: "pH 6.0 seviyesinde — hafif asidik, gübreleme planı güncellendi.", severity: "WARNING" },
    { type: "LIGHT_ADJUSTED",      message: "Yapay aydınlatma devreye alındı — güneş ışığı yetersiz.",         severity: "INFO"    },
  ];
  return defs.map((e, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(i / 2));
    d.setHours(8 + (i % 4) * 3, 0, 0, 0);
    return { id: `sim-${i}`, ...e, createdAt: d.toISOString() };
  });
}

// ── Shared components ─────────────────────────────────────────────────────────

function fmtShortDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(d);
}

interface MetricCardProps {
  icon:    React.ReactNode;
  label:   string;
  value:   string;
  unit?:   string;
  color?:  string;
  status?: "ok" | "warn" | "off";
}

function MetricCard({ icon, label, value, unit, color = "text-gray-700", status }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
        <span className={`${color} opacity-70`}>{icon}</span>
        {label}
      </div>
      <div className="flex items-end gap-1 mt-0.5">
        <span className={`text-xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-xs text-gray-400 mb-0.5">{unit}</span>}
      </div>
      {status !== undefined && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit mt-0.5 ${
          status === "ok"   ? "bg-green-100 text-green-700" :
          status === "warn" ? "bg-amber-100 text-amber-700" :
                              "bg-gray-100 text-gray-500"
        }`}>
          {status === "ok" ? "Normal" : status === "warn" ? "Dikkat" : "—"}
        </span>
      )}
    </div>
  );
}

function AlertBanner({ message, severity }: { message: string; severity: Severity }) {
  const styles = {
    INFO:     { bg: "bg-blue-50  border-blue-200",  text: "text-blue-800",  Icon: Info         },
    WARNING:  { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", Icon: TriangleAlert },
    CRITICAL: { bg: "bg-red-50   border-red-200",   text: "text-red-800",   Icon: ShieldAlert  },
  } as const;
  const { bg, text, Icon } = styles[severity];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${bg}`}>
      <Icon size={15} className={`${text} shrink-0 mt-0.5`} />
      <p className={`text-sm ${text}`}>{message}</p>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "genel",     label: "Genel Durum"      },
  { id: "sensorler", label: "Sensörler"         },
  { id: "grafikler", label: "Grafikler"         },
  { id: "cihazlar",  label: "Cihazlar"          },
  { id: "otomasyon", label: "Otomasyon Geçmişi" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FarmerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const fields = await prisma.field.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Sprout size={40} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Kayıtlı sera bulunamadı.</p>
      </div>
    );
  }

  const field = fields[0];

  const [dbReadings, recentEvents, dbWeather, latestCritical] = await Promise.all([
    prisma.sensorReading.findMany({
      where: { fieldId: field.id },
      orderBy: { createdAt: "asc" },
      take: 7,
    }),
    prisma.automationEvent.findMany({
      where: { fieldId: field.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.weatherReading.findMany({
      where: { fieldId: field.id },
      orderBy: { createdAt: "asc" },
      take: 7,
    }),
    prisma.notification.findFirst({
      where: { userId, severity: "CRITICAL", relatedFieldId: field.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // ── Simulation fallback ───────────────────────────────────────────────────
  const isSimulation = dbReadings.length === 0;

  const readings: DisplayReading[] = isSimulation
    ? generateSimReadings()
    : dbReadings.map((r) => ({
        temperature:  r.temperature,
        humidity:     r.humidity,
        ph:           r.ph,
        ec:           r.ec,
        lightLevel:   r.lightLevel,
        soilMoisture: r.soilMoisture,
        createdAt:    r.createdAt,
        source:       r.source as DisplayReading["source"],
        deviceId:     r.deviceId,
      }));

  const weatherReadings: DisplayWeather[] = isSimulation && dbWeather.length === 0
    ? generateSimWeather()
    : dbWeather.map((w) => ({
        outsideTemperature: w.outsideTemperature,
        outsideHumidity:    w.outsideHumidity,
        rainChance:         w.rainChance,
        windSpeed:          w.windSpeed,
        solarRadiation:     w.solarRadiation,
        createdAt:          w.createdAt,
        source:             w.source as DisplayWeather["source"],
        provider:           w.provider,
      }));

  const displayEvents: DisplayEvent[] = isSimulation && recentEvents.length === 0
    ? generateSimEvents()
    : recentEvents.map((e) => ({
        id:        e.id,
        type:      e.type,
        message:   e.message,
        severity:  e.severity as string,
        createdAt: e.createdAt.toISOString(),
      }));

  // ── Derive display values ─────────────────────────────────────────────────
  const latest         = readings[readings.length - 1];
  const currentWeather = weatherReadings[weatherReadings.length - 1] ?? null;

  const engineResult = runAutomation(
    {
      temperature:  latest.temperature,
      humidity:     latest.humidity,
      soilMoisture: latest.soilMoisture,
      lightLevel:   latest.lightLevel,
      ec:           latest.ec,
      ph:           latest.ph,
    },
    currentWeather
      ? {
          outsideTemperature: currentWeather.outsideTemperature,
          solarRadiation:     currentWeather.solarRadiation,
          windSpeed:          currentWeather.windSpeed,
        }
      : undefined
  );

  const chartData: SensorDataPoint[] = readings.map((r) => ({
    date:         fmtShortDate(r.createdAt),
    temperature:  r.temperature,
    humidity:     r.humidity,
    ph:           r.ph,
    ec:           r.ec,
    lightLevel:   r.lightLevel,
    soilMoisture: r.soilMoisture,
  }));

  const phStatus   = (latest.ph   ?? 7)  < 5.5 || (latest.ph   ?? 7)  > 7.5 ? "warn" : "ok";
  const ecStatus   = (latest.ec   ?? 0)  > 3.5                                ? "warn" : "ok";
  const tempStatus = (latest.temperature ?? 20) > 27                          ? "warn" : "ok";
  const isAuto     = field.automationMode === "AUTO";

  const { tab: rawTab = "genel" } = await searchParams;
  const activeTab = (TABS.some((t) => t.id === rawTab) ? rawTab : "genel") as TabId;

  const sourceMeta    = SENSOR_SOURCE_META[latest.source];
  const sourceLabel   = isSimulation ? "Simulation Mode" : sourceMeta.label;
  const sourceBadge   = isSimulation
    ? "bg-amber-500/10 text-amber-300 border-amber-400/30"
    : sourceMeta.tone;
  const sourceDot     = isSimulation ? "bg-amber-400" : sourceMeta.dot;

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/80 mb-1">
            {isSimulation ? "Demo Mode · No Live Device" : "Live IoT Monitoring"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sensör Analitikleri</h1>
          <p className="text-sm text-white/55 mt-1">{field.name} · Son 7 gün</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSimulation && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-400/30">
              <FlaskConical size={11} />
              Simulation Mode
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${isAuto ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAuto ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isAuto ? "AI Otomasyon" : "Manuel Mod"}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${sourceBadge}`}>
            <Radio size={11} />
            <span className={`w-1.5 h-1.5 rounded-full ${sourceDot}`} />
            {sourceLabel}
          </span>
          {!isSimulation && (
            <LiveStatus lastUpdatedAt={latest.createdAt.toISOString()} />
          )}
        </div>
      </div>

      {/* ── Simulation notice banner ────────────────────────────────────────── */}
      {isSimulation && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-500/5">
          <FlaskConical size={14} className="text-amber-300 shrink-0" />
          <p className="text-sm text-amber-200/80">
            Demo verileri gösteriliyor. Gerçek sensör okumalarınız <code className="text-amber-300 text-xs bg-amber-500/10 px-1 rounded">POST /api/iot/sensor-readings</code> ile bağlandığında bu ekran otomatik güncellenecek.
          </p>
        </div>
      )}

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

      {/* ── Genel Durum ──────────────────────────────────────────────────────── */}
      {activeTab === "genel" && (
        <div className="space-y-4">
          {latestCritical && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
              <div className="p-2 rounded-lg bg-red-100 shrink-0"><BellRing size={16} className="text-red-700" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-red-900">{latestCritical.title}</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Kritik</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">{latestCritical.message}</p>
                <p className="text-[10px] text-red-600/70 mt-1">
                  {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(latestCritical.createdAt)}
                </p>
              </div>
              <Link href="/dashboard/farmer/notifications?filter=critical" className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 shrink-0">
                Tüm kritikler <ArrowRight size={11} />
              </Link>
            </div>
          )}

          {engineResult.alerts.length > 0 && (
            <div className="space-y-2">
              {engineResult.alerts.map((alert, i) => (
                <AlertBanner key={i} message={alert.message} severity={alert.severity} />
              ))}
            </div>
          )}

          {engineResult.alerts.length === 0 && !latestCritical && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200/30 bg-emerald-500/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-sm text-emerald-200/80">Tüm sistemler normal çalışıyor.</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-2">
              <span className="text-xs text-white/40">
                Veri Kaynağı: <span className="text-white/70">{sourceLabel}</span>
              </span>
              {!isSimulation && latest.deviceId && (
                <span className="text-xs text-white/40">· Cihaz: <span className="text-white/70">{latest.deviceId}</span></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sensörler ────────────────────────────────────────────────────────── */}
      {activeTab === "sensorler" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard icon={<Thermometer size={14} />} label="Sıcaklık"    value={latest.temperature?.toFixed(1) ?? "—"} unit="°C"    color="text-orange-500" status={tempStatus} />
            <MetricCard icon={<Droplets    size={14} />} label="Nem"         value={latest.humidity?.toFixed(0)    ?? "—"} unit="%"     color="text-blue-500"   status="ok" />
            <MetricCard icon={<Gauge       size={14} />} label="pH"          value={latest.ph?.toFixed(1)          ?? "—"}              color="text-amber-500"  status={phStatus} />
            <MetricCard icon={<Zap         size={14} />} label="EC"          value={latest.ec?.toFixed(1)          ?? "—"} unit="dS/m"  color="text-purple-500" status={ecStatus} />
            <MetricCard icon={<Sun         size={14} />} label="Işık"        value={latest.lightLevel ? (latest.lightLevel / 1000).toFixed(0) : "—"} unit="klux" color="text-yellow-500" />
            <MetricCard icon={<Sprout      size={14} />} label="Toprak Nemi" value={latest.soilMoisture?.toFixed(0) ?? "—"} unit="%"   color="text-green-600"  status={latest.soilMoisture != null && latest.soilMoisture < 55 ? "warn" : "ok"} />
          </div>

          {currentWeather && (
            <Card className="border-sky-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base font-semibold">Dış Koşullar</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const meta = WEATHER_SOURCE_META[currentWeather.source];
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.tone}`}>
                          <CloudSun size={11} />
                          {meta.short}
                          {currentWeather.provider && <span className="opacity-70">· {currentWeather.provider}</span>}
                        </span>
                      );
                    })()}
                    {!isSimulation && <WeatherSyncButton />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <MetricCard icon={<span className="text-sm">🌡️</span>} label="Dış Sıcaklık"    value={currentWeather.outsideTemperature?.toFixed(1) ?? "—"} unit="°C"   color="text-sky-600"    status={(currentWeather.outsideTemperature ?? 0) > 30 ? "warn" : "ok"} />
                  <MetricCard icon={<span className="text-sm">💧</span>} label="Dış Nem"         value={currentWeather.outsideHumidity?.toFixed(0)    ?? "—"} unit="%"    color="text-blue-500" />
                  <MetricCard icon={<span className="text-sm">🌧️</span>} label="Yağmur İhtimali" value={currentWeather.rainChance?.toFixed(0)          ?? "—"} unit="%"    color="text-indigo-500" status={(currentWeather.rainChance ?? 0) > 60 ? "warn" : "ok"} />
                  <MetricCard icon={<span className="text-sm">💨</span>} label="Rüzgar"          value={currentWeather.windSpeed?.toFixed(0)           ?? "—"} unit="km/h" color="text-teal-500"   status={(currentWeather.windSpeed ?? 0) > 35 ? "warn" : "ok"} />
                  <MetricCard icon={<span className="text-sm">☀️</span>} label="Güneş Rad."      value={currentWeather.solarRadiation?.toFixed(0)      ?? "—"} unit="W/m²" color="text-yellow-500" status={(currentWeather.solarRadiation ?? 999) < 200 ? "warn" : "ok"} />
                </div>
                <p className="text-xs text-gray-500 mt-3 border-t border-gray-100 pt-3">
                  {(currentWeather.rainChance ?? 0) > 60 ? "⚠ Yağmur bekleniyor — sulama dozunu azaltın, sera nemini yakından izleyin."
                    : (currentWeather.windSpeed ?? 0) > 35 ? "⚠ Güçlü rüzgar — havalandırmayı kademeli açın, ani basınç değişiminden kaçının."
                    : (currentWeather.solarRadiation ?? 999) < 200 ? "⚠ Düşük güneş radyasyonu — yapay aydınlatmayı devreye almayı değerlendirin."
                    : (currentWeather.outsideTemperature ?? 0) > 30 ? "⚠ Yüksek dış sıcaklık — soğutma kapasitesi kısıtlanabilir, havalandırmayı erkenden açın."
                    : "✓ Dış koşullar şu an sera yönetimini olumsuz etkilemiyor."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Grafikler ────────────────────────────────────────────────────────── */}
      {activeTab === "grafikler" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Sıcaklık &amp; Nem (7 gün)</CardTitle></CardHeader>
              <CardContent className="pt-0"><TempHumidityChart data={chartData} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">pH &amp; EC (7 gün)</CardTitle></CardHeader>
              <CardContent className="pt-0"><PhEcChart data={chartData} /></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Toprak Nemi (7 gün)</CardTitle></CardHeader>
            <CardContent className="pt-0"><SoilMoistureChart data={chartData} /></CardContent>
          </Card>
          {isSimulation && (
            <p className="text-xs text-white/30 text-center">Grafikler demo verilerle oluşturulmuştur.</p>
          )}
        </div>
      )}

      {/* ── Cihazlar ─────────────────────────────────────────────────────────── */}
      {activeTab === "cihazlar" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Cihaz Kontrolü</CardTitle></CardHeader>
          <CardContent>
            <DeviceControl
              fieldId={field.id}
              mode={field.automationMode}
              devices={{ irrigationOn: field.irrigationOn, ventilationOn: field.ventilationOn, lightingOn: field.lightingOn }}
              aiDevices={engineResult.devices}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Otomasyon Geçmişi ────────────────────────────────────────────────── */}
      {activeTab === "otomasyon" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Otomasyon Geçmişi</CardTitle></CardHeader>
            <CardContent><ActivityTimeline events={displayEvents} /></CardContent>
          </Card>
          <p className="text-xs text-gray-400 text-center">
            {isSimulation
              ? "Demo otomasyon olayları gösteriliyor · POST /api/iot/sensor-readings ile gerçek cihaz bağlanabilir"
              : <>
                  Veri Kaynağı: {sourceMeta.label}
                  {latest.deviceId && <> · Cihaz: <span className="font-medium">{latest.deviceId}</span></>}
                  {!sourceMeta.isLive && " · POST /api/iot/sensor-readings ile gerçek cihaz bağlanabilir"}
                </>
            }
          </p>
        </div>
      )}
    </div>
  );
}
