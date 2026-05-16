"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name:            z.string().min(2, "İsim en az 2 karakter olmalı"),
  email:           z.email("Geçerli bir e-posta giriniz"),
  password:        z.string().min(6, "En az 6 karakter"),
  confirmPassword: z.string(),
  role:            z.enum(["FARMER", "CONSULTANT"]),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50";

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>,
    defaultValues: { role: "FARMER" },
  });

  function onSubmit(_data: FormValues) {
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-green-600 font-bold text-2xl">Seranova</span>
          <p className="text-gray-500 text-sm mt-1">Yapay Zeka Destekli Sera İşletim Platformu</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Hesap Oluştur</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ad Soyad</Label>
              <Input placeholder="Ahmet Yılmaz" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input type="email" placeholder="ornek@email.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Hesap Türü</Label>
              <select {...register("role")} className={selectClass}>
                <option value="FARMER">Üretici</option>
                <option value="CONSULTANT">Ziraat Danışmanı</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Şifre</Label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Şifre (Tekrar)</Label>
              <Input type="password" placeholder="••••••••" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kayıt Ol"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
