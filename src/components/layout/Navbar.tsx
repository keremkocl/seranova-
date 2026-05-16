"use client";

import Link from "next/link";
import { Bell, Leaf } from "lucide-react";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/types";

const ROLE_LABELS: Record<Role, string> = {
  FARMER: "Üretici",
  CONSULTANT: "Danışman",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<Role, "default" | "secondary" | "destructive" | "outline"> = {
  FARMER: "default",
  CONSULTANT: "secondary",
  ADMIN: "destructive",
};

interface NavbarProps {
  user: { name: string; email: string; role: Role };
  unreadNotifications?: number;
}

export default function Navbar({ user, unreadNotifications = 0 }: NavbarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 glass-pane border-b flex items-center justify-between px-6">
      <Link href="/dashboard" className="select-none flex items-center gap-2">
        <Leaf size={18} className="text-lime-300" />
        <span className="text-lime-300 font-bold text-lg tracking-tight lime-glow">Seranova</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/farmer/notifications"
          aria-label={`Bildirimler${unreadNotifications > 0 ? ` (${unreadNotifications} okunmamış)` : ""}`}
          className="relative p-2 text-white/65 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
        >
          <Bell size={18} />
          {unreadNotifications > 0 && (
            <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-rose-500 text-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-colors">
            <Avatar className="h-8 w-8 ring-1 ring-lime-300/40">
              <AvatarFallback className="bg-gradient-to-br from-lime-300/30 to-emerald-500/30 text-lime-200 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white/95 leading-none">{user.name}</p>
              <p className="text-xs text-white/45 mt-0.5">{user.email}</p>
            </div>
            <Badge variant={ROLE_COLORS[user.role]} className="text-xs hidden sm:inline-flex">
              {ROLE_LABELS[user.role]}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Ayarlar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
