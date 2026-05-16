"use client";

import { useState, useEffect } from "react";

function getRelative(ts: string): string {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60)   return `${secs} sn önce`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins} dk önce`;
  return `${Math.floor(mins / 60)} sa önce`;
}

export default function LiveStatus({ lastUpdatedAt }: { lastUpdatedAt: string }) {
  const [relative, setRelative] = useState(() => getRelative(lastUpdatedAt));

  useEffect(() => {
    const id = setInterval(() => setRelative(getRelative(lastUpdatedAt)), 15000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
      <span className="font-medium text-green-700">AI aktif izliyor</span>
      <span className="text-gray-300">·</span>
      <span>{relative}</span>
    </div>
  );
}
