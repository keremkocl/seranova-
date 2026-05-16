"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAnalysisAction } from "@/app/(dashboard)/dashboard/farmer/analyses/new/actions";

export type FieldOption = {
  id: string;
  name: string;
  crops: { id: string; name: string }[];
};

interface Props {
  fields: FieldOption[];
}

const schema = z.object({
  fieldId:       z.string().min(1, "Alan seçiniz"),
  cropId:        z.string().optional(),
  soilPh:        z.coerce.number({ error: "Sayı giriniz" }).min(0).max(14),
  soilEc:        z.coerce.number({ error: "Sayı giriniz" }).min(0),
  nitrogen:      z.coerce.number({ error: "Sayı giriniz" }).min(0),
  phosphorus:    z.coerce.number({ error: "Sayı giriniz" }).min(0),
  potassium:     z.coerce.number({ error: "Sayı giriniz" }).min(0),
  organicMatter: z.coerce.number({ error: "Sayı giriniz" }).min(0),
  waterPh:       z.coerce.number({ error: "Sayı giriniz" }).min(0).max(14).optional().or(z.literal("")),
  waterEc:       z.coerce.number({ error: "Sayı giriniz" }).min(0).optional().or(z.literal("")),
  notes:         z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const selectClass =
  "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50";

const soilFields = [
  { name: "soilPh"        as const, label: "pH Değeri",    unit: "",      step: "0.1" },
  { name: "soilEc"        as const, label: "EC Değeri",    unit: "dS/m",  step: "0.01" },
  { name: "nitrogen"      as const, label: "Azot (N)",      unit: "ppm",  step: "1"   },
  { name: "phosphorus"    as const, label: "Fosfor (P)",    unit: "ppm",  step: "1"   },
  { name: "potassium"     as const, label: "Potasyum (K)",  unit: "ppm",  step: "1"   },
  { name: "organicMatter" as const, label: "Organik Madde", unit: "%",    step: "0.1" },
];

const waterFields = [
  { name: "waterPh" as const, label: "Sulama Suyu pH", unit: "",      step: "0.1" },
  { name: "waterEc" as const, label: "Sulama Suyu EC", unit: "dS/m",  step: "0.01" },
];

export default function SoilAnalysisForm({ fields }: Props) {
  const router = useRouter();
  const [selectedFieldId, setSelectedFieldId] = useState("");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>,
  });

  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const cropOptions   = selectedField?.crops ?? [];

  async function onSubmit(data: FormValues) {
    const result = await createAnalysisAction({
      fieldId:       data.fieldId,
      cropId:        data.cropId || undefined,
      soilPh:        data.soilPh,
      soilEc:        data.soilEc,
      nitrogen:      data.nitrogen,
      phosphorus:    data.phosphorus,
      potassium:     data.potassium,
      organicMatter: data.organicMatter,
      waterPh:       data.waterPh !== "" ? (data.waterPh as number | undefined) : undefined,
      waterEc:       data.waterEc !== "" ? (data.waterEc as number | undefined) : undefined,
      notes:         data.notes || undefined,
    });

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Analiz kaydedildi. Gübre öneriniz oluşturuldu.");
    router.push(`/dashboard/farmer/recommendations/${result.recommendationId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Alan & Ürün */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alan &amp; Ürün Bilgisi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Alan</Label>
            <select
              {...register("fieldId")}
              className={selectClass}
              onChange={(e) => {
                setValue("fieldId", e.target.value);
                setValue("cropId", "");
                setSelectedFieldId(e.target.value);
              }}
            >
              <option value="">Alan seçiniz</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {errors.fieldId && <p className="text-xs text-red-500">{errors.fieldId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Ürün</Label>
            <select
              {...register("cropId")}
              className={selectClass}
              disabled={cropOptions.length === 0}
            >
              <option value="">{cropOptions.length === 0 ? "Önce alan seçiniz" : "Ürün seçiniz (isteğe bağlı)"}</option>
              {cropOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Toprak değerleri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toprak Analiz Değerleri</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {soilFields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label>
                {f.label}
                {f.unit && <span className="text-gray-400 font-normal ml-1">({f.unit})</span>}
              </Label>
              <Input
                type="number"
                step={f.step}
                {...register(f.name)}
                className={errors[f.name] ? "border-red-400" : ""}
              />
              {errors[f.name] && (
                <p className="text-xs text-red-500">{errors[f.name]?.message as string}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sulama suyu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sulama Suyu Değerleri <span className="text-sm font-normal text-gray-400">(isteğe bağlı)</span></CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {waterFields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label>
                {f.label}
                {f.unit && <span className="text-gray-400 font-normal ml-1">({f.unit})</span>}
              </Label>
              <Input
                type="number"
                step={f.step}
                placeholder="—"
                {...register(f.name)}
                className={errors[f.name] ? "border-red-400" : ""}
              />
              {errors[f.name] && (
                <p className="text-xs text-red-500">{errors[f.name]?.message as string}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notlar <span className="text-sm font-normal text-gray-400">(isteğe bağlı)</span></CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            {...register("notes")}
            rows={3}
            placeholder="Ek gözlemler, özel durumlar..."
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {isSubmitting ? "Kaydediliyor..." : "Analizi Kaydet"}
        </button>
      </div>
    </form>
  );
}
