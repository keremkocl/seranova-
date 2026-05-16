import StatsCard from "@/components/dashboard/StatsCard";
import { Users, FlaskConical, Sprout, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Admin Paneli</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Toplam Kullanıcı"  value={4}   icon={Users}        color="blue"  />
        <StatsCard title="Toplam Analiz"     value={19}  icon={FlaskConical} color="green" trend={{ value: 25, label: "bu ay" }} />
        <StatsCard title="Aktif Sera"        value={6}   icon={Sprout}       color="amber" />
        <StatsCard title="Ort. Verim Artışı" value="%16" icon={TrendingUp}   color="rose"  />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hızlı Erişim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/dashboard/admin/users",     label: "Kullanıcı Yönetimi",    desc: "Kullanıcıları görüntüle ve yönet" },
              { href: "/dashboard/admin/analytics", label: "Sistem İstatistikleri", desc: "Platform geneli istatistikler" },
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
    </div>
  );
}
