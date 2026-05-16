"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFieldAction } from "./actions";

const schema = z.object({
  name:         z.string().min(1, "Sera adı zorunludur"),
  type:         z.enum(["GREENHOUSE", "OPEN_FIELD", "ORCHARD"]),
  areaHectares: z.string().optional(),
  locationLat:  z.string().optional(),
  locationLng:  z.string().optional(),
  cropName:     z.string().optional(),
  plantCount:   z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const FIELD_TYPE_OPTIONS = [
  { value: "GREENHOUSE", label: "Sera"       },
  { value: "OPEN_FIELD", label: "Açık Alan"  },
  { value: "ORCHARD",    label: "Bahçe"      },
] as const;

export default function NewFieldPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "GREENHOUSE" },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);

    const result = await createFieldAction({
      name:         data.name,
      type:         data.type,
      areaHectares: data.areaHectares ? parseFloat(data.areaHectares) : undefined,
      locationLat:  data.locationLat  ? parseFloat(data.locationLat)  : undefined,
      locationLng:  data.locationLng  ? parseFloat(data.locationLng)  : undefined,
      cropName:     data.cropName     || undefined,
      plantCount:   data.plantCount   ? parseInt(data.plantCount, 10)  : undefined,
    });

    if ("error" in result) {
      setServerError(result.error);
      return;
    }

    router.push("/dashboard/farmer/fields");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/farmer/fields"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Yeni Sera Ekle</h1>
          <p className="text-sm text-white/50 mt-0.5">Alanınızı sisteme kaydedin.</p>
        </div>
      </div>

      <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-5">

          {/* Sera adı */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-white/80">Sera Adı <span className="text-red-400">*</span></Label>
            <Input
              id="name"
              placeholder="ör. Kuzey Sera 1"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          {/* Alan tipi */}
          <div className="space-y-1.5">
            <Label htmlFor="type" className="text-white/80">Alan Tipi</Label>
            <select
              id="type"
              className="w-full h-10 rounded-md border border-white/10 bg-white/5 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              {...register("type")}
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Alan büyüklüğü */}
          <div className="space-y-1.5">
            <Label htmlFor="areaHectares" className="text-white/80">Alan Büyüklüğü (hektar)</Label>
            <Input
              id="areaHectares"
              type="number"
              step="0.001"
              min="0"
              placeholder="ör. 0.05"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              {...register("areaHectares")}
            />
            <p className="text-[11px] text-white/30">1 hektar = 10.000 m²</p>
          </div>

          {/* Konum */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="locationLat" className="text-white/80">Enlem</Label>
              <Input
                id="locationLat"
                type="number"
                step="0.000001"
                placeholder="ör. 36.8969"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                {...register("locationLat")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationLng" className="text-white/80">Boylam</Label>
              <Input
                id="locationLng"
                type="number"
                step="0.000001"
                placeholder="ör. 30.7133"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                {...register("locationLng")}
              />
            </div>
          </div>

          {/* Ürün */}
          <div className="space-y-1.5">
            <Label htmlFor="cropName" className="text-white/80">Ürün Adı <span className="text-white/30 font-normal">(opsiyonel)</span></Label>
            <Input
              id="cropName"
              placeholder="ör. Domates, Biber…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              {...register("cropName")}
            />
          </div>

          {/* Bitki sayısı */}
          <div className="space-y-1.5">
            <Label htmlFor="plantCount" className="text-white/80">Bitki Sayısı <span className="text-white/30 font-normal">(opsiyonel)</span></Label>
            <Input
              id="plantCount"
              type="number"
              min="1"
              placeholder="ör. 500"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              {...register("plantCount")}
            />
          </div>

          {serverError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {isSubmitting ? "Kaydediliyor…" : "Serayı Kaydet"}
            </button>
            <Link
              href="/dashboard/farmer/fields"
              className="px-4 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
            >
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
