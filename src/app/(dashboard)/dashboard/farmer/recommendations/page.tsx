import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const REC_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Taslak",      color: "bg-gray-100 text-gray-600"   },
  SUBMITTED: { label: "İncelemede",  color: "bg-blue-100 text-blue-700"   },
  APPROVED:  { label: "Onaylandı",   color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "Reddedildi",  color: "bg-red-100 text-red-700"     },
  REVISED:   { label: "Revize",      color: "bg-amber-100 text-amber-700" },
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function RecommendationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const recs = await prisma.recommendation.findMany({
    where: { farmerId: userId },
    include: { field: true, crop: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/80 mb-1">Fertigation Recipes</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Gübre Önerileri</h1>
        <p className="text-sm text-white/55 mt-1">Tüm analizlere ait gübre önerileri</p>
      </div>

      {recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Leaf size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Henüz gübre önerisi bulunmuyor.</p>
          <p className="text-sm text-gray-400 mt-1">
            Öneri almak için{" "}
            <Link href="/dashboard/farmer/analyses/new" className="text-green-600 hover:underline">
              yeni bir toprak analizi
            </Link>{" "}
            girin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recs.map((rec) => {
            const st = REC_STATUS[rec.status] ?? { label: rec.status, color: "bg-gray-100 text-gray-600" };
            return (
              <Link key={rec.id} href={`/dashboard/farmer/recommendations/${rec.id}`}>
                <Card className="hover:shadow-md hover:border-green-200 transition-all h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {rec.title}
                      </CardTitle>
                      {rec.crop && (
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">{rec.crop.name}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                      <p className="text-xs text-gray-400">{fmtDate(rec.createdAt)}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {rec.field && (
                      <p className="text-xs text-gray-500 mb-2">
                        <span className="font-medium">Alan:</span> {rec.field.name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {(() => {
                        try {
                          const c = JSON.parse(rec.content);
                          return c.summary ?? rec.content;
                        } catch {
                          return rec.content;
                        }
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
