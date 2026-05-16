"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Sprout,
  Users,
  BarChart3,
  Settings,
  Leaf,
  Activity,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  { href: "/dashboard/farmer",                  label: "Dashboard",     icon: <LayoutDashboard size={18} />, roles: ["FARMER"] },
  { href: "/dashboard/farmer/fields",           label: "Seralarım",     icon: <Sprout size={18} />,          roles: ["FARMER"] },
  { href: "/dashboard/farmer/analyses",         label: "Analizler",     icon: <FlaskConical size={18} />,    roles: ["FARMER"] },
  { href: "/dashboard/farmer/recommendations",  label: "Öneriler",      icon: <Leaf size={18} />,            roles: ["FARMER"] },
  { href: "/dashboard/farmer/analytics",        label: "Sensörler",     icon: <Activity size={18} />,        roles: ["FARMER"] },
  { href: "/dashboard/farmer/ai-assistant",     label: "AI Asistan",    icon: <Sparkles size={18} />,        roles: ["FARMER"] },
  { href: "/dashboard/consultant",              label: "Dashboard",     icon: <LayoutDashboard size={18} />, roles: ["CONSULTANT"] },
  { href: "/dashboard/consultant/clients",      label: "Müşteriler",    icon: <Users size={18} />,           roles: ["CONSULTANT"] },
  { href: "/dashboard/consultant/reports",      label: "Raporlar",      icon: <BarChart3 size={18} />,       roles: ["CONSULTANT"] },
  { href: "/dashboard/admin",                   label: "Dashboard",     icon: <LayoutDashboard size={18} />, roles: ["ADMIN"] },
  { href: "/dashboard/admin/users",             label: "Kullanıcılar",  icon: <Users size={18} />,           roles: ["ADMIN"] },
  { href: "/dashboard/admin/analytics",         label: "İstatistikler", icon: <BarChart3 size={18} />,       roles: ["ADMIN"] },
];

interface SidebarProps {
  role: Role;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const visible = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-60 min-h-screen glass-pane border-r flex flex-col">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
        <Leaf size={18} className="text-lime-300" />
        <span className="text-lime-300 font-bold text-lg tracking-tight lime-glow">Seranova</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "nav-active"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className={active ? "text-lime-300" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/45 hover:bg-white/5 hover:text-white/80 transition-colors"
        >
          <Settings size={18} />
          Ayarlar
        </Link>
        <p className="px-3 pt-3 text-[10px] text-white/30 uppercase tracking-widest">
          Sensor-ready architecture
        </p>
      </div>
    </aside>
  );
}
