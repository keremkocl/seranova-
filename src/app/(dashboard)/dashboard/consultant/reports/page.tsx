"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { approveRecommendation, rejectRecommendation, reviseRecommendation } from "./actions";
import { toast } from "sonner";
import { GROWTH_STAGE_LABELS } from "@/lib/recommendation-engine";
import type { GrowthStage, RecommendationContent } from "@/lib/recommendation-engine";
import { FileText } from "lucide-react";

interface RecRow {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  farmer: { name: string | null; email: string };
  field:  { name: string } | null;
  crop:   { name: string; growthStage: string } | null;
  content: string;
  consultantNote: string | null;
  confidenceScore: number | null;
  estimatedCost:   string | null;
  riskSummary:     string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Taslak",      color: "bg-gray-100 text-gray-600"   },
  SUBMITTED: { label: "İncelemede",  color: "bg-blue-100 text-blue-700"   },
  APPROVED:  { label: "Onaylandı",   color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "Reddedildi",  color: "bg-red-100 text-red-700"     },
  REVISED:   { label: "Revize",      color: "bg-amber-100 text-amber-700" },
};

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

function NoteModal({
  onConfirm,
  onCancel,
  title,
  placeholder,
  required,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  title: string;
  placeholder: string;
  required?: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={() => { if (required && !note.trim()) return; onConfirm(note.trim()); }}
            disabled={required && !note.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

function RecCard({ rec, onAction }: { rec: RecRow; onAction: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<"approve" | "reject" | "revise" | null>(null);
  const st = STATUS_MAP[rec.status] ?? { label: rec.status, color: "bg-gray-100 text-gray-600" };

  let summary = rec.content;
  try {
    const c: RecommendationContent = JSON.parse(rec.content);
    summary = c.summary ?? rec.content;
  } catch { /* plain text */ }

  function handle(action: "approve" | "reject" | "revise", note: string) {
    setModal(null);
    startTransition(async () => {
      let result: { error?: string };
      if      (action === "approve") result = await approveRecommendation(rec.id, note || undefined);
      else if (action === "reject")  result = await rejectRecommendation(rec.id, note);
      else                           result = await reviseRecommendation(rec.id, note);

      if (result.error) toast.error(result.error);
      else {
        toast.success(action === "approve" ? "Öneri onaylandı." : action === "reject" ? "Öneri reddedildi." : "Revize istendi.");
        onAction();
      }
    });
  }

  return (
    <>
      {modal === "approve" && (
        <NoteModal
          title="Onay notu (isteğe bağlı)"
          placeholder="Danışman notu ekleyebilirsiniz..."
          onConfirm={(n) => handle("approve", n)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "reject" && (
        <NoteModal
          title="Red nedeni"
          placeholder="Ret gerekçesini yazınız..."
          required={true}
          onConfirm={(n) => handle("reject", n)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "revise" && (
        <NoteModal
          title="Revize talebi"
          placeholder="Hangi değişikliklerin yapılması gerektiğini yazınız..."
          required={true}
          onConfirm={(n) => handle("revise", n)}
          onCancel={() => setModal(null)}
        />
      )}

      <Card className="hover:shadow-sm transition-all">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">{rec.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {rec.farmer.name ?? rec.farmer.email}
                {rec.field && ` · ${rec.field.name}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {rec.crop && (
                <Badge variant="outline" className="text-xs">
                  {rec.crop.name} – {GROWTH_STAGE_LABELS[rec.crop.growthStage as GrowthStage] ?? rec.crop.growthStage}
                </Badge>
              )}
              {rec.confidenceScore != null && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  rec.confidenceScore >= 80 ? "bg-green-100 text-green-700"
                  : rec.confidenceScore >= 65 ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
                }`}>
                  Güven %{rec.confidenceScore.toFixed(0)}
                </span>
              )}
              <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                {st.label}
              </span>
              <span className="text-xs text-gray-400">{fmtDate(rec.createdAt)}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">{summary}</p>

          {rec.riskSummary && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg line-clamp-2">
              <span className="font-medium">Risk: </span>{rec.riskSummary}
            </p>
          )}

          {rec.estimatedCost && (
            <p className="text-xs text-gray-500">
              Tahmini maliyet: <span className="font-medium text-gray-700">{rec.estimatedCost}</span>
            </p>
          )}

          {rec.consultantNote && (
            <p className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
              <span className="font-medium">Not:</span> {rec.consultantNote}
            </p>
          )}

          {rec.status === "SUBMITTED" && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal("approve")}
                disabled={isPending}
                className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
              >
                Onayla
              </button>
              <button
                onClick={() => setModal("revise")}
                disabled={isPending}
                className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
              >
                Revize İste
              </button>
              <button
                onClick={() => setModal("reject")}
                disabled={isPending}
                className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
              >
                Reddet
              </button>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Link
              href={`/dashboard/farmer/recommendations/${rec.id}/report`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-green-700"
            >
              <FileText size={12} /> Raporu Aç
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function ConsultantReportsPage() {
  const [recs, setRecs] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/consultant/recommendations");
      if (res.ok) setRecs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Raporlarım</h1>
        <p className="text-sm text-gray-500 mt-1">Çiftçilere ait gübre önerileri – onay kuyruğu</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Yükleniyor...</p>
      ) : recs.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">İncelenecek öneri bulunamadı.</p>
      ) : (
        <div className="space-y-4">
          {recs.map((r) => (
            <RecCard key={r.id} rec={r} onAction={load} />
          ))}
        </div>
      )}
    </div>
  );
}
