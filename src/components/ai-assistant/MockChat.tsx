"use client";

import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { MockQA } from "@/lib/ai-assistant-engine";

interface Props {
  answers: MockQA[];
}

export default function MockChat({ answers }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIdx(openIdx === i ? null : i);
  }

  return (
    <div className="space-y-3">
      {answers.map((qa, i) => (
        <div
          key={i}
          className={`rounded-xl border transition-all duration-200 ${
            openIdx === i
              ? "border-green-200 bg-green-50/30 shadow-sm"
              : "border-gray-100 bg-white hover:border-green-100"
          }`}
        >
          {/* Question button */}
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg shrink-0 ${openIdx === i ? "bg-green-100" : "bg-gray-100"}`}>
                <MessageSquare size={14} className={openIdx === i ? "text-green-700" : "text-gray-500"} />
              </div>
              <span className="text-sm font-medium text-gray-800">{qa.question}</span>
            </div>
            {openIdx === i
              ? <ChevronUp size={15} className="text-green-600 shrink-0" />
              : <ChevronDown size={15} className="text-gray-400 shrink-0" />
            }
          </button>

          {/* Answer */}
          {openIdx === i && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-2.5 mt-1 p-3 rounded-lg bg-white border border-green-100">
                <div className="p-1.5 rounded-lg bg-green-100 shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-green-700" />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {qa.answer}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">
                Seranova · Simüle edilmiş AI yanıtı
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
