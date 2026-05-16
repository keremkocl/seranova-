import { MapPin, Ruler, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const mockFarm = {
  id: "1",
  name: "Sera 1",
  location: "Antalya, Kumluca",
  area: 1800,
  crop: "Domates",
  analyses: [
    { id: "1", date: "3 Mayıs 2026",   ph: 6.4, nitrogen: 28, phosphorus: 14, potassium: 210 },
    { id: "2", date: "10 Mart 2026",   ph: 6.1, nitrogen: 22, phosphorus: 12, potassium: 190 },
  ],
};

export default function FieldDetailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{mockFarm.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1"><MapPin size={14} />{mockFarm.location}</span>
          <span className="flex items-center gap-1"><Ruler size={14} />{mockFarm.area.toLocaleString("tr-TR")} m²</span>
          <Badge variant="outline">{mockFarm.crop}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Analiz Geçmişi</CardTitle>
          <Link href="/dashboard/farmer/analyses/new" className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
            <FlaskConical size={14} /> Yeni Analiz
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Tarih</th>
                  <th className="text-right py-2 pr-4">pH</th>
                  <th className="text-right py-2 pr-4">N (ppm)</th>
                  <th className="text-right py-2 pr-4">P (ppm)</th>
                  <th className="text-right py-2">K (ppm)</th>
                </tr>
              </thead>
              <tbody>
                {mockFarm.analyses.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      <Link href={`/dashboard/farmer/analyses/${a.id}`} className="hover:text-green-600">{a.date}</Link>
                    </td>
                    <td className="text-right pr-4 text-gray-700">{a.ph}</td>
                    <td className="text-right pr-4 text-gray-700">{a.nitrogen}</td>
                    <td className="text-right pr-4 text-gray-700">{a.phosphorus}</td>
                    <td className="text-right text-gray-700">{a.potassium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
