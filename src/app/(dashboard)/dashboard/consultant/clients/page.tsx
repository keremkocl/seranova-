import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const mockClients = [
  { id: "1", name: "Ahmet Yılmaz",  location: "Antalya",  farms: 3, lastAnalysis: "3 Mayıs 2026",   status: "Aktif" },
  { id: "2", name: "Fatma Kaya",    location: "Mersin",   farms: 2, lastAnalysis: "25 Nisan 2026",  status: "Aktif" },
  { id: "3", name: "Mehmet Demir",  location: "İzmir",    farms: 1, lastAnalysis: "12 Nisan 2026",  status: "Pasif" },
];

export default function ConsultantClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşterilerim</h1>
          <p className="text-sm text-gray-500 mt-1">{mockClients.length} kayıtlı üretici</p>
        </div>
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Users size={16} /> Müşteri Ekle
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">İsim</th>
                <th className="text-left px-4 py-3">Konum</th>
                <th className="text-right px-4 py-3">Sera</th>
                <th className="text-left px-4 py-3">Son Analiz</th>
                <th className="text-left px-5 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {mockClients.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.location}</td>
                  <td className="px-4 py-3 text-right">{c.farms}</td>
                  <td className="px-4 py-3 text-gray-500">{c.lastAnalysis}</td>
                  <td className="px-5 py-3">
                    <Badge className={c.status === "Aktif" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
