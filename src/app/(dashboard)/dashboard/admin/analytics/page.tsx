import StatsCard from "@/components/dashboard/StatsCard";
import { Users, FlaskConical, Sprout, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem İstatistikleri</h1>
        <p className="text-sm text-gray-500 mt-1">Platform geneli özet</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Toplam Kullanıcı"    value={4}   icon={Users}        color="blue"  />
        <StatsCard title="Toplam Analiz"       value={19}  icon={FlaskConical} color="green" trend={{ value: 25, label: "bu ay" }} />
        <StatsCard title="Aktif Sera"          value={6}   icon={Sprout}       color="amber" />
        <StatsCard title="Ort. Verim Artışı"   value="%16" icon={TrendingUp}   color="rose"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Ürün Dağılımı</CardTitle></CardHeader>
          <CardContent>
            {[
              { label: "Domates",    count: 9, pct: 47 },
              { label: "Biber",      count: 6, pct: 32 },
              { label: "Salatalık",  count: 4, pct: 21 },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-gray-500">{item.count} analiz ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bölge Dağılımı</CardTitle></CardHeader>
          <CardContent>
            {[
              { label: "Antalya",  count: 12, pct: 63 },
              { label: "Mersin",   count:  5, pct: 26 },
              { label: "İzmir",    count:  2, pct: 11 },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-gray-500">{item.count} kullanıcı ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
