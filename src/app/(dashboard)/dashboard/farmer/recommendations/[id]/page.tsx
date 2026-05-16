import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GROWTH_STAGE_LABELS } from "@/lib/recommendation-engine";
import type { GrowthStage } from "@/lib/recommendation-engine";
import type { FertilizerLineItem } from "@/lib/fertigation-engine";
import { ArrowLeft, Send, TriangleAlert, CheckCircle2, FlaskConical, Droplets, Leaf, Zap, FileText } from "lucide-react";
import { submitRecommendationAction } from "./actions";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Taslak",      color: "bg-gray-100 text-gray-600"    },
  SUBMITTED: { label: "İncelemede",  color: "bg-blue-100 text-blue-700"    },
  APPROVED:  { label: "Onaylandı",   color: "bg-green-100 text-green-700"  },
  REJECTED:  { label: "Reddedildi",  color: "bg-red-100 text-red-700"      },
  REVISED:   { label: "Revize",      color: "bg-amber-100 text-amber-700"  },
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 65 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Güven Skoru</span>
        <span className="font-semibold text-gray-800">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default async function RecommendationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rec = await prisma.recommendation.findFirst({
    where: { id, farmerId: session.user.id },
    include: { field: true, crop: true, soilAnalysis: true, waterAnalysis: true },
  });
  if (!rec) notFound();

  const st = STATUS_MAP[rec.status] ?? { label: rec.status, color: "bg-gray-100 text-gray-600" };
  const hasFertPlan = rec.confidenceScore != null;

  let fertPlan: FertilizerLineItem[] = [];
  if (rec.fertilizerPlan) {
    try { fertPlan = JSON.parse(rec.fertilizerPlan); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/farmer/recommendations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={15} /> Tüm Öneriler
        </Link>
        <Link
          href={`/dashboard/farmer/recommendations/${id}/report`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-green-600 text-green-700 hover:bg-green-50 transition-colors"
        >
          <FileText size={14} /> Rapor Oluştur
        </Link>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{rec.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{fmtDate(rec.createdAt)}</p>
        </div>
        <span className={`inline-flex text-sm font-medium px-3 py-1 rounded-full ${st.color}`}>{st.label}</span>
      </div>

      {/* ── Submit to consultant (DRAFT only) ────────────────────────────── */}
      {rec.status === "DRAFT" && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-900">Reçetenizi inceleyin</p>
              <p className="text-xs text-blue-700 mt-0.5">Hazır olduğunuzda danışmanınıza onay için gönderin.</p>
            </div>
            <form action={async () => { "use server"; await submitRecommendationAction(id); }}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Send size={14} /> Danışmana Gönder
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Consultant note ──────────────────────────────────────────────── */}
      {rec.consultantNote && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">Danışman Notu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-900">{rec.consultantNote}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Bitki & Alan ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bitki &amp; Alan Bilgisi</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Alan</p><p className="font-medium">{rec.field?.name ?? "—"}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Ürün</p><p className="font-medium">{rec.crop?.name ?? "—"}</p></div>
          {rec.crop && (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Büyüme Evresi</p>
                <p className="font-medium">{GROWTH_STAGE_LABELS[rec.crop.growthStage as GrowthStage] ?? rec.crop.growthStage}</p>
              </div>
              {rec.crop.plantCount && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Bitki Sayısı</p>
                  <p className="font-medium">{rec.crop.plantCount.toLocaleString("tr-TR")}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          FERTIGATION PLAN SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      {hasFertPlan && (
        <>
          {/* Confidence + cost header */}
          <Card className="border-green-200 bg-green-50/20">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <Leaf size={15} className="text-green-700" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Fertigation Reçetesi</span>
                  {rec.status === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> Danışman onaylı
                    </span>
                  )}
                </div>
                {rec.estimatedCost && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Tahmini Maliyet</p>
                    <p className="text-base font-bold text-gray-900">{rec.estimatedCost}</p>
                  </div>
                )}
              </div>
              {rec.confidenceScore != null && <ConfidenceBar value={rec.confidenceScore} />}
            </CardContent>
          </Card>

          {/* Target pH / EC */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-2">
                  <FlaskConical size={13} /> Hedef pH
                </div>
                <p className="text-2xl font-bold text-green-700">{rec.targetPh ?? "—"}</p>
                {rec.soilAnalysis?.ph != null && (
                  <p className="text-xs text-gray-400 mt-1">Mevcut: {rec.soilAnalysis.ph}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-2">
                  <Zap size={13} /> Hedef EC
                </div>
                <p className="text-2xl font-bold text-green-700">{rec.targetEc ?? "—"}</p>
                {rec.soilAnalysis?.ec != null && (
                  <p className="text-xs text-gray-400 mt-1">Mevcut: {rec.soilAnalysis.ec} dS/m</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Irrigation plan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets size={16} className="text-blue-500" /> Sulama Planı
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                <p className="text-xs text-gray-400 mb-1">Bitki Başına Doz</p>
                <p className="text-2xl font-bold text-blue-700">{rec.irrigationLitersPerPlant?.toFixed(1) ?? "—"} L</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                <p className="text-xs text-gray-400 mb-1">Sulama Sıklığı</p>
                <p className="text-sm font-semibold text-blue-700 leading-snug">{rec.irrigationFrequency ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* NPK advice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Azot (N) Tavsiyesi",      text: rec.nitrogenAdvice,    color: "border-green-200 bg-green-50/30",  dot: "bg-green-500"  },
              { label: "Fosfor (P) Tavsiyesi",     text: rec.phosphorusAdvice,  color: "border-purple-200 bg-purple-50/30", dot: "bg-purple-500" },
              { label: "Potasyum (K) Tavsiyesi",   text: rec.potassiumAdvice,   color: "border-amber-200 bg-amber-50/30",  dot: "bg-amber-500"  },
            ].map(({ label, text, color, dot }) => text ? (
              <Card key={label} className={`border ${color}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <p className="text-xs font-semibold text-gray-700">{label}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                </CardContent>
              </Card>
            ) : null)}
          </div>

          {/* Fertilizer plan table */}
          {fertPlan.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Gübre Uygulama Planı</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-400">
                      <th className="pb-2 pr-3 font-medium">Ürün</th>
                      <th className="pb-2 pr-3 font-medium">Doz</th>
                      <th className="pb-2 pr-3 font-medium">Sıklık</th>
                      <th className="pb-2 font-medium">Neden</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fertPlan.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 pr-3 font-medium text-gray-900 text-xs">{item.product}</td>
                        <td className="py-2.5 pr-3 text-gray-700 text-xs whitespace-nowrap">{item.dose}</td>
                        <td className="py-2.5 pr-3 text-gray-700 text-xs whitespace-nowrap">{item.frequency}</td>
                        <td className="py-2.5 text-gray-500 text-xs">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Risk summary */}
          {rec.riskSummary && (
            <Card className={rec.riskSummary.includes("risk faktörü yok") ? "border-green-100" : "border-amber-200"}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-base flex items-center gap-2 ${rec.riskSummary.includes("risk faktörü yok") ? "text-green-700" : "text-amber-700"}`}>
                  <TriangleAlert size={15} /> Risk Özeti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{rec.riskSummary}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Toprak Analiz Snapshot ────────────────────────────────────────── */}
      {rec.soilAnalysis && (
        <Card>
          <CardHeader><CardTitle className="text-base">Toprak Analiz Değerleri</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-sm">
            {[
              { label: "pH",           value: rec.soilAnalysis.ph },
              { label: "EC (dS/m)",    value: rec.soilAnalysis.ec },
              { label: "N (ppm)",      value: rec.soilAnalysis.nitrogen },
              { label: "P (ppm)",      value: rec.soilAnalysis.phosphorus },
              { label: "K (ppm)",      value: rec.soilAnalysis.potassium },
              { label: "Org. Madde %", value: rec.soilAnalysis.organicMatter },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-lg font-semibold text-gray-800">{value ?? "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Zaman Çizelgesi ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Zaman Çizelgesi</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <TimelineRow label="Öneri Oluşturuldu" date={rec.createdAt} />
          {rec.updatedAt.getTime() !== rec.createdAt.getTime() && (
            <TimelineRow label="Son Güncelleme" date={rec.updatedAt} />
          )}
          {rec.appliedAt && <TimelineRow label="Uygulandı" date={rec.appliedAt} highlight />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Öneri ID: {rec.id.slice(0, 8)}…</span>
        {rec.soilAnalysis && (
          <Link href={`/dashboard/farmer/analyses/${rec.soilAnalysis.id}`} className="text-green-600 hover:underline">
            Analiz Detayını Gör →
          </Link>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ label, date, highlight = false }: { label: string; date: Date; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`w-2 h-2 rounded-full shrink-0 ${highlight ? "bg-green-500" : "bg-gray-300"}`} />
      <span className={highlight ? "font-medium text-green-700" : "text-gray-600"}>{label}</span>
      <span className="text-gray-400 ml-auto">{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date)}</span>
    </div>
  );
}
