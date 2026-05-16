"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteFieldAction } from "./actions";

interface Props {
  fieldId:   string;
  fieldName: string;
}

export function FieldDeleteButton({ fieldId, fieldName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleIconClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setConfirming(true);
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
    startTransition(async () => {
      const result = await deleteFieldAction(fieldId);
      if ("error" in result) {
        setError(result.error);
        setTimeout(() => setError(null), 5000);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="relative" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      {/* Trigger icon */}
      {!confirming && (
        <button
          onClick={handleIconClick}
          disabled={isPending}
          title="Serayı sil"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {isPending
            ? <Loader2 size={14} className="animate-spin text-red-400" />
            : <Trash2 size={14} />
          }
        </button>
      )}

      {/* Inline confirm popover */}
      {confirming && (
        <div className="absolute right-0 top-0 z-20 w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-3 text-left">
          <p className="text-xs font-semibold text-gray-800 mb-0.5">Serayı sil?</p>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
            <span className="font-medium text-gray-700">&ldquo;{fieldName}&rdquo;</span> ve ilişkili tüm sensör verileri kalıcı olarak silinecek.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
            >
              Evet, sil
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium py-1.5 rounded-lg transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute right-0 top-8 z-20 w-60 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
