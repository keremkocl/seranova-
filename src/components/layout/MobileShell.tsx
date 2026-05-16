"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, Bell, LogOut } from "lucide-react";
import Sidebar from "./Sidebar";
import type { Role } from "@/types";

interface MobileShellProps {
  role:                 Role;
  userName:             string;
  unreadNotifications:  number;
}

export default function MobileShell({ role, userName, unreadNotifications }: MobileShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {/* ── Mobile top header (only < md) ──────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 h-14 glass-pane border-b flex items-center justify-between px-4">
        <button
          type="button"
          aria-label="Menüyü aç"
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
        >
          <Menu size={20} />
        </button>

        <Link href={`/dashboard/${role.toLowerCase()}`} className="font-bold text-lime-300 text-base tracking-tight lime-glow">
          Seranova
        </Link>

        <Link
          href="/dashboard/farmer/notifications"
          aria-label={`Bildirimler${unreadNotifications > 0 ? ` (${unreadNotifications} okunmamış)` : ""}`}
          className="relative p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-rose-500 text-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>
      </header>

      {/* ── Drawer (overlay + slide-in sidebar) ────────────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside className="relative w-72 max-w-[85vw] glass-pane border-r flex flex-col h-full animate-in slide-in-from-left">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
              <span className="text-lime-300 font-bold text-lg tracking-tight lime-glow">Seranova</span>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Sidebar role={role} />
            </div>

            <div className="border-t border-white/10 p-3">
              <p className="text-xs text-white/50 px-3 mb-2">{userName}</p>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full inline-flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors min-h-[44px]"
              >
                <LogOut size={18} /> Çıkış Yap
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
