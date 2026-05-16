"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function ReportToolbar({ backHref }: { backHref: string }) {
  return (
    <div
      data-print-hide
      className="sticky top-0 z-20 bg-white border-b border-gray-200 print:hidden"
    >
      <div className="max-w-[210mm] mx-auto flex items-center justify-between px-4 py-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={14} />
          Öneriye Dön
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          <Printer size={14} />
          PDF Olarak Kaydet
        </button>
      </div>
    </div>
  );
}
