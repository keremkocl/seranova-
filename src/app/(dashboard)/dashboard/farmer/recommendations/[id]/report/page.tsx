import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  GROWTH_STAGE_LABELS,
  type GrowthStage,
  type RecommendationContent,
} from "@/lib/recommendation-engine";
import type { FertilizerLineItem } from "@/lib/fertigation-engine";
import ReportToolbar from "./ReportToolbar";
import { Leaf } from "lucide-react";

const FIELD_TYPE_LABELS: Record<string, string> = {
  GREENHOUSE: "Sera",
  OPEN_FIELD: "Açık Alan",
  ORCHARD:    "Bahçe",
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  DRAFT:     { label: "Taslak",      tone: "border-gray-300 text-gray-700 bg-gray-50"      },
  SUBMITTED: { label: "İncelemede",  tone: "border-blue-300 text-blue-700 bg-blue-50"      },
  APPROVED:  { label: "Onaylandı",   tone: "border-green-400 text-green-700 bg-green-50"   },
  REJECTED:  { label: "Reddedildi",  tone: "border-red-300 text-red-700 bg-red-50"         },
  REVISED:   { label: "Revize",      tone: "border-amber-300 text-amber-700 bg-amber-50"   },
};

const WEATHER_LABELS: Record<string, string> = {
  SUNNY: "Güneşli", CLOUDY: "Bulutlu", RAINY: "Yağmurlu", WINDY: "Rüzgarlı", STORMY: "Fırtınalı",
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as "FARMER" | "CONSULTANT" | "ADMIN";

  const rec = await prisma.recommendation.findFirst({
    where:
      role === "FARMER"
        ? { id, farmerId: session.user.id }
        : role === "CONSULTANT"
        ? { id, status: { not: "DRAFT" } }
        : { id },
    include: {
      field:         true,
      crop:          true,
      soilAnalysis:  true,
      waterAnalysis: true,
      farmer:        { select: { name: true, email: true } },
    },
  });
  if (!rec) notFound();

  const [latestSensor, latestWeather] = rec.fieldId
    ? await Promise.all([
        prisma.sensorReading.findFirst({
          where: { fieldId: rec.fieldId }, orderBy: { createdAt: "desc" },
        }),
        prisma.weatherReading.findFirst({
          where: { fieldId: rec.fieldId }, orderBy: { createdAt: "desc" },
        }),
      ])
    : [null, null];

  // Parse JSON-encoded fields
  let fertPlan: FertilizerLineItem[] = [];
  if (rec.fertilizerPlan) {
    try { fertPlan = JSON.parse(rec.fertilizerPlan); } catch { /* ignore */ }
  }
  let summary = rec.content;
  try {
    const c: RecommendationContent = JSON.parse(rec.content);
    summary = c.summary ?? rec.content;
  } catch { /* plain text */ }

  const st = STATUS_LABELS[rec.status] ?? STATUS_LABELS.DRAFT;
  const hasFert = rec.confidenceScore != null;
  const confColor =
    (rec.confidenceScore ?? 0) >= 80 ? "text-green-700"
      : (rec.confidenceScore ?? 0) >= 65 ? "text-amber-700"
      : "text-red-600";

  return (
    <div className="theme-light -m-4 sm:-m-5 md:-m-6 bg-gray-100 min-h-[calc(100vh+1rem)] text-gray-800 print:bg-white print:m-0">
      <ReportToolbar backHref={`/dashboard/farmer/recommendations/${id}`} />

      <div className="max-w-[210mm] mx-auto py-8 px-4 print:py-0 print:px-0">
        <article className="print-page bg-white border border-gray-200 rounded-lg shadow-md p-10 print:p-0 print:shadow-none print:rounded-none print:border-0 text-gray-800">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <header className="border-b-2 border-green-700 pb-5 mb-7 flex items-start justify-between gap-4 print-keep">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-green-600 text-white">
                  <Leaf size={16} />
                </div>
                <h1 className="text-2xl font-bold text-green-700 tracking-tight">Seranova</h1>
              </div>
              <p className="text-xs text-gray-500">Akıllı Sera & Fertigation Yönetim Sistemi</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Fertigation Raporu</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{fmtDate(new Date())}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">No: FA-{rec.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </header>

          {/* ── Title + Status ──────────────────────────────────────────── */}
          <section className="mb-7 print-keep">
            <h2 className="text-xl font-semibold text-gray-900">{rec.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${st.tone}`}>
                {st.label}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">Oluşturuldu: {fmtDateTime(rec.createdAt)}</span>
            </div>
            {summary && summary !== rec.content && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{summary}</p>
            )}
          </section>

          {/* ── Farmer / Field / Crop ──────────────────────────────────── */}
          <Section title="Çiftçi & Sera Bilgileri">
            <InfoTable rows={[
              ["Çiftçi",          rec.farmer.name ?? rec.farmer.email],
              ["E-posta",         rec.farmer.email],
              ["Sera / Alan",     rec.field?.name ?? "—"],
              ["Alan Tipi",       rec.field?.type ? (FIELD_TYPE_LABELS[rec.field.type] ?? rec.field.type) : "—"],
              ["Alan Büyüklüğü",  rec.field?.areaHectares != null ? `${rec.field.areaHectares} ha` : "—"],
              ["Bitki",           rec.crop?.name ?? "—"],
              ["Çeşit",           rec.crop?.variety ?? "—"],
              ["Büyüme Evresi",   rec.crop ? (GROWTH_STAGE_LABELS[rec.crop.growthStage as GrowthStage] ?? rec.crop.growthStage) : "—"],
              ["Bitki Sayısı",    rec.crop?.plantCount ? rec.crop.plantCount.toLocaleString("tr-TR") : "—"],
              ["Analiz Tarihi",   rec.soilAnalysis?.analyzedAt ? fmtDate(rec.soilAnalysis.analyzedAt) : "—"],
            ]} />
          </Section>

          {/* ── Soil Analysis ──────────────────────────────────────────── */}
          {rec.soilAnalysis && (
            <Section title="Toprak Analizi">
              <MetricsRow metrics={[
                { label: "pH",            value: rec.soilAnalysis.ph,            unit: ""     },
                { label: "EC",            value: rec.soilAnalysis.ec,            unit: "dS/m" },
                { label: "Azot (N)",      value: rec.soilAnalysis.nitrogen,      unit: "ppm"  },
                { label: "Fosfor (P)",    value: rec.soilAnalysis.phosphorus,    unit: "ppm"  },
                { label: "Potasyum (K)",  value: rec.soilAnalysis.potassium,     unit: "ppm"  },
                { label: "Organik Madde", value: rec.soilAnalysis.organicMatter, unit: "%"    },
              ]} />
              {rec.soilAnalysis.notes && (
                <p className="text-xs text-gray-500 italic mt-3">Not: {rec.soilAnalysis.notes}</p>
              )}
            </Section>
          )}

          {/* ── Water Analysis ─────────────────────────────────────────── */}
          {rec.waterAnalysis && (
            <Section title="Su Analizi">
              <MetricsRow metrics={[
                { label: "pH",      value: rec.waterAnalysis.ph,       unit: ""     },
                { label: "EC",      value: rec.waterAnalysis.ec,       unit: "dS/m" },
                { label: "Sertlik", value: rec.waterAnalysis.hardness, unit: "°dH"  },
                { label: "Nitrat",  value: rec.waterAnalysis.nitrate,  unit: "ppm"  },
              ]} />
            </Section>
          )}

          {/* ── Weather Context ────────────────────────────────────────── */}
          {latestWeather && (
            <Section title="Hava Durumu Bağlamı">
              <MetricsRow metrics={[
                { label: "Dış Sıcaklık", value: latestWeather.outsideTemperature, unit: "°C"   },
                { label: "Dış Nem",      value: latestWeather.outsideHumidity,    unit: "%"    },
                { label: "Yağmur",       value: latestWeather.rainChance,         unit: "%"    },
                { label: "Rüzgar",       value: latestWeather.windSpeed,          unit: "km/h" },
                { label: "Güneş Rad.",   value: latestWeather.solarRadiation,     unit: "W/m²" },
              ]} />
              <p className="text-xs text-gray-500 mt-3">
                Koşul: <span className="font-medium text-gray-700">{WEATHER_LABELS[latestWeather.condition] ?? latestWeather.condition}</span>
                <span className="text-gray-400"> · {fmtDateTime(latestWeather.createdAt)}</span>
              </p>
            </Section>
          )}

          {/* ── Sensor Snapshot ────────────────────────────────────────── */}
          {latestSensor && (
            <Section title="Sensör Anlık Görüntüsü">
              <MetricsRow metrics={[
                { label: "Sıcaklık",    value: latestSensor.temperature,  unit: "°C"   },
                { label: "Nem",         value: latestSensor.humidity,     unit: "%"    },
                { label: "pH",          value: latestSensor.ph,           unit: ""     },
                { label: "EC",          value: latestSensor.ec,           unit: "dS/m" },
                { label: "Toprak Nemi", value: latestSensor.soilMoisture, unit: "%"    },
                { label: "Işık",        value: latestSensor.lightLevel,   unit: "lux"  },
              ]} />
              <p className="text-xs text-gray-400 mt-3">Okuma: {fmtDateTime(latestSensor.createdAt)}</p>
            </Section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              FERTIGATION SECTION
          ══════════════════════════════════════════════════════════════ */}
          {hasFert && (
            <section className="mt-8 pt-6 border-t-2 border-green-700">
              <h3 className="text-base font-bold text-green-800 mb-4 tracking-wide uppercase">
                Fertigation Reçetesi
              </h3>

              {/* Targets + irrigation summary */}
              <div className="grid grid-cols-4 gap-3 mb-5 print-keep">
                <Stat label="Hedef pH"        value={rec.targetPh ?? "—"} />
                <Stat label="Hedef EC"        value={rec.targetEc ?? "—"} />
                <Stat
                  label="Sulama Dozu"
                  value={rec.irrigationLitersPerPlant != null ? `${rec.irrigationLitersPerPlant.toFixed(1)} L/bitki` : "—"}
                />
                <Stat label="Sulama Sıklığı"  value={rec.irrigationFrequency ?? "—"} />
              </div>

              {/* NPK advice */}
              {(rec.nitrogenAdvice || rec.phosphorusAdvice || rec.potassiumAdvice) && (
                <div className="mb-5 print-keep">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">NPK Tavsiyeleri</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Azot (N)",     text: rec.nitrogenAdvice,    border: "border-green-300"  },
                      { label: "Fosfor (P)",   text: rec.phosphorusAdvice,  border: "border-purple-300" },
                      { label: "Potasyum (K)", text: rec.potassiumAdvice,   border: "border-amber-300"  },
                    ].map(({ label, text, border }) => text ? (
                      <div key={label} className={`border-l-4 ${border} pl-3`}>
                        <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Fertilizer plan table */}
              {fertPlan.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gübre Uygulama Planı</p>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300 text-left text-gray-700">
                        <th className="py-2 pr-3 font-semibold">Ürün</th>
                        <th className="py-2 pr-3 font-semibold">Doz</th>
                        <th className="py-2 pr-3 font-semibold">Sıklık</th>
                        <th className="py-2 font-semibold">Gerekçe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fertPlan.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100 align-top">
                          <td className="py-2 pr-3 font-medium text-gray-900">{item.product}</td>
                          <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{item.dose}</td>
                          <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{item.frequency}</td>
                          <td className="py-2 text-gray-600">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Risk + cost + confidence summary block */}
              <div className="grid grid-cols-3 gap-3 mt-5 print-keep">
                {rec.riskSummary && (
                  <div className="col-span-2 p-3 border border-amber-200 bg-amber-50/50 rounded">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">Risk Özeti</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{rec.riskSummary}</p>
                  </div>
                )}
                <div className="p-3 border border-gray-200 rounded space-y-2">
                  {rec.estimatedCost && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tahmini Maliyet</p>
                      <p className="text-sm font-semibold text-gray-900">{rec.estimatedCost}</p>
                    </div>
                  )}
                  {rec.confidenceScore != null && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Güven Skoru</p>
                      <p className={`text-sm font-semibold ${confColor}`}>%{rec.confidenceScore.toFixed(0)}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Consultant evaluation ──────────────────────────────────── */}
          {(rec.consultantNote || rec.status === "APPROVED" || rec.status === "REJECTED" || rec.status === "REVISED") && (
            <Section title="Danışman Değerlendirmesi">
              <p className="text-xs text-gray-500 mb-2">
                Durum: <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] ${st.tone}`}>{st.label}</span>
              </p>
              {rec.consultantNote ? (
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded p-3">
                  {rec.consultantNote}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">Danışman notu eklenmedi.</p>
              )}
            </Section>
          )}

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <footer className="mt-10 pt-5 border-t border-gray-200 text-[10px] text-gray-500 flex items-center justify-between print-keep">
            <p>Seranova · Otomatik üretilmiş fertigation raporu. Bilgilendirme amaçlıdır; uygulamadan önce danışman onayı alınız.</p>
            <p>Üretim: {fmtDateTime(new Date())}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 print-keep">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-gray-100 last:border-0">
            <td className="py-1.5 pr-4 text-gray-500 w-1/3">{label}</td>
            <td className="py-1.5 text-gray-900 font-medium">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetricsRow({ metrics }: { metrics: { label: string; value: number | null; unit: string }[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {metrics.map(({ label, value, unit }) => {
        const display = value == null
          ? "—"
          : `${value.toFixed(value % 1 === 0 ? 0 : 1)}${unit ? ` ${unit}` : ""}`;
        return (
          <div key={label} className="text-center p-2 border border-gray-100 rounded">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{display}</p>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border border-gray-200 rounded text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-green-700 leading-tight">{value}</p>
    </div>
  );
}
