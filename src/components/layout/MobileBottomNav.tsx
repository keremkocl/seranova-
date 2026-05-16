"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sprout, Activity, Sparkles, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  href:  string;
  label: string;
  icon:  React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: Tab[] = [
  { href: "/dashboard/farmer",                label: "Panel",     icon: LayoutDashboard },
  { href: "/dashboard/farmer/fields",         label: "Seralar",   icon: Sprout          },
  { href: "/dashboard/farmer/analytics",      label: "Sensör",    icon: Activity        },
  { href: "/dashboard/farmer/ai-assistant",   label: "AI",        icon: Sparkles        },
  { href: "/dashboard/farmer/notifications",  label: "Alarmlar",  icon: Bell            },
];

interface MobileBottomNavProps {
  unreadNotifications?: number;
}

export default function MobileBottomNav({ unreadNotifications = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      data-print-hide
      className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-pane border-t print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.href === "/dashboard/farmer"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          const isBell = tab.href === "/dashboard/farmer/notifications";
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors",
                  active ? "text-emerald-300" : "text-white/55"
                )}
              >
                <div className="relative">
                  <Icon size={20} className={active ? "text-emerald-300" : "text-white/55"} />
                  {isBell && unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 inline-flex items-center justify-center text-[9px] font-semibold rounded-full bg-rose-500 text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
