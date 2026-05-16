import StatsCard from "@/components/dashboard/StatsCard";
import { Users, BarChart3, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const recentClients = [
  { id: "1", name: "Ahmet Yılmaz", location: "Antalya", lastAnalysis: "3 Mayıs 2026",  status: "Aktif" },
  { id: "2", name: "Fatma Kaya",   location: "Mersin",  lastAnalysis: "25 Nisan 2026", status: "Aktif" },
];

export default function ConsultantDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ali Güzel · Danışman Paneli</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Aktif Müşteri"    value={3} icon={Users}        color="blue"  />
        <StatsCard title="Bu Ay Rapor"      value={5} icon={BarChart3}    color="green" trend={{ value: 25, label: "geçen aya göre" }} />
        <StatsCard title="Bekleyen Analiz"  value={2} icon={FlaskConical} color="amber" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Son Müşteri Aktivitesi</CardTitle>
            <Link href="/dashboard/consultant/clients" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Tümünü Gör →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentClients.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.location} · Son analiz: {c.lastAnalysis}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">{c.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
