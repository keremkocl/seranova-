import { Plus, Sprout, Ruler, Thermometer, Droplets, Gauge, Brain, Sliders } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FieldDeleteButton } from "./delete-button";

const FIELD_TYPE_LABELS: Record<string, string> = {
  GREENHOUSE: "Sera",
  OPEN_FIELD: "Açık Alan",
  ORCHARD:    "Bahçe",
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function fmtRelative(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60)  return `${mins} dk önce`;
  if (mins < 1440) return `${Math.floor(mins / 60)} sa önce`;
  return `${Math.floor(mins / 1440)} gün önce`;
}

export default async function FieldsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const fields = await prisma.field.findMany({
    where: { userId },
    include: {
      crops:         { take: 1 },
      soilAnalyses:  { orderBy: { createdAt: "desc" }, take: 1 },
      sensorReadings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalAreaM2 = Math.round(
    fields.reduce((sum, f) => sum + (f.areaHectares ?? 0), 0) * 10000
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seralarım</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {fields.length} alan
            {totalAreaM2 > 0 && ` · ${totalAreaM2.toLocaleString("tr-TR")} m²`}
          </p>
        </div>
        <Link
          href="/dashboard/farmer/fields/new"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Sera Ekle
        </Link>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sprout size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Henüz kayıtlı alanınız yok.</p>
          <p className="text-sm text-gray-400 mt-1">Yukarıdaki "Sera Ekle" butonunu kullanarak başlayın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fields.map((field) => {
            const cropName     = field.crops[0]?.name ?? null;
            const lastAnalysis = field.soilAnalyses[0] ?? null;
            const sensor       = field.sensorReadings[0] ?? null;
            const areaM2       = field.areaHectares ? Math.round(field.areaHectares * 10000) : null;

            return (
              <Link key={field.id} href={`/dashboard/farmer/fields/${field.id}`}>
                <Card className="hover:shadow-md hover:border-green-200 transition-all cursor-pointer h-full">
                  <CardContent className="p-5 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{field.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          field.automationMode === "AUTO"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {field.automationMode === "AUTO"
                            ? <Brain size={10} />
                            : <Sliders size={10} />
                          }
                          {field.automationMode === "AUTO" ? "AI" : "Manuel"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {FIELD_TYPE_LABELS[field.type] ?? field.type}
                        </Badge>
                        <FieldDeleteButton fieldId={field.id} fieldName={field.name} />
                      </div>
                    </div>

                    {/* Basic info */}
                    <div className="space-y-1.5 text-sm text-gray-500 mb-3">
                      {cropName && (
                        <div className="flex items-center gap-1.5">
                          <Sprout size={13} className="text-gray-400" />
                          {cropName}
                        </div>
                      )}
                      {areaM2 && (
                        <div className="flex items-center gap-1.5">
                          <Ruler size={13} className="text-gray-400" />
                          {areaM2.toLocaleString("tr-TR")} m²
                        </div>
                      )}
                    </div>

                    {/* Live sensor strip */}
                    {sensor ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-gray-400">{fmtRelative(sensor.createdAt)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <SensorPill
                            icon={<Thermometer size={11} />}
                            value={sensor.temperature != null ? `${sensor.temperature.toFixed(1)}°C` : "—"}
                            color="text-orange-500 bg-orange-50"
                          />
                          <SensorPill
                            icon={<Droplets size={11} />}
                            value={sensor.humidity != null ? `${sensor.humidity.toFixed(0)}%` : "—"}
                            color="text-blue-500 bg-blue-50"
                          />
                          <SensorPill
                            icon={<Gauge size={11} />}
                            value={sensor.ph != null ? `pH ${sensor.ph.toFixed(1)}` : "—"}
                            color="text-amber-500 bg-amber-50"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-auto pt-3 border-t border-gray-50">
                        {lastAnalysis
                          ? `Son analiz: ${fmtDate(lastAnalysis.createdAt)}`
                          : "Sensör verisi yok"}
                      </p>
                    )}
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

function SensorPill({
  icon,
  value,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${color}`}>
      {icon}
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}
