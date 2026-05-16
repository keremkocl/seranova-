"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";

const schema = z.object({
  email:    z.email("Geçerli bir e-posta giriniz"),
  password: z.string().min(6, "En az 6 karakter"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { onBlur: emailBlur, ...emailRest }       = register("email");
  const { onBlur: passwordBlur, ...passwordRest } = register("password");

  const BORDER_IDLE   = "1px solid rgba(255,255,255,0.12)";
  const BORDER_FOCUS  = "1px solid rgba(52,211,153,0.55)";

  async function onSubmit(data: FormValues) {
    setAuthError(null);
    const result = await signIn("credentials", {
      email:    data.email,
      password: data.password,
      redirect: false,
    });

    if (!result || result.error) {
      setAuthError("E-posta veya şifre hatalı.");
      return;
    }

    router.push("/dashboard/farmer");
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden">

      {/* ── background photo ── */}
      <Image
        src="/greenhouse-hero.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
      />

      {/* ── directional overlay: dark-left → lighter-right ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(0,0,0,0.88) 0%, rgba(3,36,18,0.82) 38%, rgba(5,60,40,0.65) 65%, rgba(6,78,59,0.45) 100%)",
        }}
      />

      {/* ── LEFT — brand ── */}
      <div className="hidden lg:flex flex-col justify-center pl-20 pr-8 w-[48%] relative z-10">
        <div>
          {/* wordmark */}
          <h1
            className="text-7xl tracking-widest text-white/90"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 500 }}
          >
            SERANOVA
          </h1>

          {/* accent line */}
          <div
            className="mt-5 h-px w-48"
            style={{
              background: "linear-gradient(to right, #34d399, transparent)",
            }}
          />
        </div>
      </div>

      {/* ── RIGHT — login ── */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-16 lg:px-16">
        <div className="w-full max-w-[360px]">

          {/* mobile wordmark */}
          <p
            className="lg:hidden text-center text-4xl tracking-widest text-white/90 mb-10"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 500 }}
          >
            SERANOVA
          </p>

          {/* glassmorphism card */}
          <div
            className="rounded-2xl px-8 py-9"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
            }}
          >
            {/* card header */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white tracking-tight">Giriş Yap</h2>
              <p className="text-sm text-white/45 mt-1">Seranova&apos;ya hoş geldiniz</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-5">

              {/* email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-medium text-emerald-300 uppercase tracking-wider">
                  E-posta
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    placeholder="ornek@email.com"
                    className="w-full h-11 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-white/25 outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: BORDER_IDLE }}
                    onFocus={e => (e.currentTarget.style.border = BORDER_FOCUS)}
                    onBlur={e  => { e.currentTarget.style.border = BORDER_IDLE; emailBlur(e); }}
                    {...emailRest}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs font-medium text-emerald-300 uppercase tracking-wider">
                  Şifre
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-white/25 outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: BORDER_IDLE }}
                    onFocus={e => (e.currentTarget.style.border = BORDER_FOCUS)}
                    onBlur={e  => { e.currentTarget.style.border = BORDER_IDLE; passwordBlur(e); }}
                    {...passwordRest}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              {authError && (
                <p className="text-xs text-red-400 text-center">{authError}</p>
              )}

              {/* submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white tracking-wide transition-opacity disabled:opacity-50 mt-1"
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)",
                }}
              >
                {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
              </button>
            </form>

            {/* demo box */}
            <div
              className="mt-7 rounded-xl px-4 py-3.5"
              style={{
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.16)",
              }}
            >
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-2">Demo Hesap</p>
              <p className="text-xs text-white/55 font-mono leading-5">farmer@example.com</p>
              <p className="text-xs text-white/55 font-mono leading-5">password123</p>
            </div>

            {/* register link */}
            <p className="text-center text-xs text-white/30 mt-6">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
