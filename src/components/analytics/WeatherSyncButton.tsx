"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SyncResponse {
  created:  number;
  source:   "SIMULATION" | "EXTERNAL_API" | null;
  provider: string | null;
  external: boolean;
  message?: string;
}

export default function WeatherSyncButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setPending(true);
    try {
      const res = await fetch("/api/weather/sync", { method: "POST" });
      const data: SyncResponse = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "sync failed");

      if (data.created === 0) {
        toast.message(data.message ?? "Hava verisi oluşturulmadı.");
      } else {
        const label = data.source === "EXTERNAL_API" ? "Gerçek hava API verisi" : "Simülasyon verisi";
        toast.success(
          `${data.created} sera için hava verisi güncellendi.`,
          { description: `${label}${data.provider ? ` · ${data.provider}` : ""}` }
        );
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hava verisi güncellenemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 min-h-[36px] text-xs font-medium rounded-lg border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 disabled:opacity-60 transition-colors"
    >
      <RefreshCw size={12} className={pending ? "animate-spin" : ""} />
      {pending ? "Güncelleniyor..." : "Hava Verisini Güncelle"}
    </button>
  );
}
