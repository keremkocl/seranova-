import { Plus, FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ANALYSIS_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Taslak",      color: "bg-gray-100 text-gray-600"   },
  SUBMITTED: { label: "Gönderildi",  color: "bg-blue-100 text-blue-700"   },
  REVIEWED:  { label: "İncelendi",   color: "bg-green-100 text-green-700" },
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function AnalysesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const analyses = await prisma.soilAnalysis.findMany({
    where: { field: { userId } },
    include: { field: { include: { crops: { take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/80 mb-1">Soil & Water Lab</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Analizler</h1>
          <p className="text-sm text-white/55 mt-1">{analyses.length} kayıt</p>
        </div>
        <Link
          href="/dashboard/farmer/analyses/new"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-emerald-950 text-sm font-semibold px-4 min-h-[44px] rounded-xl transition-all shadow-[0_0_20px_rgba(132,204,22,0.35)]"
        >
          <Plus size={16} /> Yeni Analiz
        </Link>
      </div>

      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FlaskConical size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Henüz analiz kaydı yok.</p>
          <p className="text-sm text-gray-400 mt-1">İlk analizinizi eklemek için &quot;Yeni Analiz&quot; butonunu kullanın.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile card list (< md) ─────────────────────────────────── */}
          <div className="space-y-3 md:hidden">
            {analyses.map((a) => {
              const cropName = a.field.crops[0]?.name ?? "—";
              const st = ANALYSIS_STATUS_LABELS[a.status] ?? { label: a.status, color: "bg-gray-100 text-gray-600" };
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/farmer/analyses/${a.id}`}
                  className="block rounded-xl border border-gray-100 bg-white p-4 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FlaskConical size={14} className="text-gray-400 shrink-0" />
                      <p className="font-medium text-gray-900 truncate">{a.field.name}</p>
                    </div>
                    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {cropName !== "—" && (
                      <Badge variant="outline" className="text-[10px]">{cropName}</Badge>
                    )}
                    <span className="text-gray-500">{fmtDate(a.createdAt)}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-700"><span className="text-gray-400">pH</span> {a.ph != null ? a.ph : "—"}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Desktop table (md+) ─────────────────────────────────────── */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Alan</th>
                      <th className="text-left px-4 py-3">Ürün</th>
                      <th className="text-left px-4 py-3">Tarih</th>
                      <th className="text-right px-4 py-3">pH</th>
                      <th className="text-left px-4 py-3">Durum</th>
                      <th className="text-right px-5 py-3">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a) => {
                      const cropName = a.field.crops[0]?.name ?? "—";
                      const st = ANALYSIS_STATUS_LABELS[a.status] ?? { label: a.status, color: "bg-gray-100 text-gray-600" };
                      return (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <FlaskConical size={14} className="text-gray-400" />
                              {a.field.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">{cropName}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(a.createdAt)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {a.ph != null ? a.ph : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link href={`/dashboard/farmer/analyses/${a.id}`} className="text-green-600 hover:text-green-700 font-medium">
                              İncele →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
