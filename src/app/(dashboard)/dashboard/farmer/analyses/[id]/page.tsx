import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FertilizerChart from "@/components/recommendations/FertilizerChart";
import { AlertTriangle } from "lucide-react";

const mockAnalysis = {
  id: "1",
  farm: "Sera 1",
  crop: "Domates",
  date: "3 Mayıs 2026",
  ph: 6.4,
  nitrogen: 28,
  phosphorus: 14,
  potassium: 210,
  calcium: 180,
  magnesium: 45,
  ecValue: 2.1,
  organicMatter: 1.8,
};

const mockRecommendation = {
  nitrogenDose:   27,
  phosphorusDose: 11,
  potassiumDose:  38,
  calciumDose:    17,
  magnesiumDose:   6,
  notes: "Organik madde düşük; kompost/ahır gübresi takviyesi önerilir.",
  applicationSchedule: [
    { week: 1,  label: "Dikim öncesi",    nitrogen: 8,  phosphorus: 6, potassium: 10 },
    { week: 3,  label: "Vejetatif",       nitrogen: 7,  phosphorus: 2, potassium: 10 },
    { week: 6,  label: "Çiçeklenme",      nitrogen: 7,  phosphorus: 2, potassium: 9  },
    { week: 10, label: "Meyve bağlama",   nitrogen: 5,  phosphorus: 1, potassium: 9  },
  ],
};

const soilRows = [
  { label: "pH", value: mockAnalysis.ph, unit: "", ideal: "6.0 – 7.0" },
  { label: "Azot (N)", value: mockAnalysis.nitrogen, unit: "ppm", ideal: "20 – 40" },
  { label: "Fosfor (P)", value: mockAnalysis.phosphorus, unit: "ppm", ideal: "10 – 20" },
  { label: "Potasyum (K)", value: mockAnalysis.potassium, unit: "ppm", ideal: "150 – 300" },
  { label: "Kalsiyum (Ca)", value: mockAnalysis.calcium, unit: "ppm", ideal: "> 150" },
  { label: "Magnezyum (Mg)", value: mockAnalysis.magnesium, unit: "ppm", ideal: "> 30" },
  { label: "EC Değeri", value: mockAnalysis.ecValue, unit: "dS/m", ideal: "1.5 – 3.0" },
  { label: "Organik Madde", value: mockAnalysis.organicMatter, unit: "%", ideal: "> 2" },
];

export default function AnalysisDetailPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analiz Sonucu</h1>
          <p className="text-sm text-gray-500 mt-1">{mockAnalysis.farm} · {mockAnalysis.date}</p>
        </div>
        <Badge variant="outline" className="text-sm">{mockAnalysis.crop}</Badge>
      </div>

      {mockRecommendation.notes && (
        <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{mockRecommendation.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toprak Değerleri</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-400 text-xs uppercase">
                  <th className="text-left py-2 pr-4">Parametre</th>
                  <th className="text-right py-2 pr-4">Değer</th>
                  <th className="text-right py-2">İdeal Aralık</th>
                </tr>
              </thead>
              <tbody>
                {soilRows.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 text-gray-600">{row.label}</td>
                    <td className="text-right pr-4 font-semibold text-gray-900">{row.value} {row.unit}</td>
                    <td className="text-right text-gray-400 text-xs">{row.ideal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toplam Gübre Önerisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Azot (N)",        value: mockRecommendation.nitrogenDose,   color: "bg-green-500" },
                { label: "Fosfor (P)",       value: mockRecommendation.phosphorusDose, color: "bg-blue-500"  },
                { label: "Potasyum (K)",     value: mockRecommendation.potassiumDose,  color: "bg-amber-500" },
                { label: "Kalsiyum (Ca)",    value: mockRecommendation.calciumDose,    color: "bg-purple-500"},
                { label: "Magnezyum (Mg)",   value: mockRecommendation.magnesiumDose,  color: "bg-rose-500"  },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value} kg/da</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.min(100, (item.value / 40) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gübre Uygulama Takvimi</CardTitle>
        </CardHeader>
        <CardContent>
          <FertilizerChart schedule={mockRecommendation.applicationSchedule} />
        </CardContent>
      </Card>
    </div>
  );
}
