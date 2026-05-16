import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title:     string;
  value:     string | number;
  subtitle?: string;
  icon:      LucideIcon;
  trend?:    { value: number; label: string };
  /** Legacy prop — kept for compatibility; visual treatment is now monochrome. */
  color?:    "green" | "blue" | "amber" | "rose";
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
            <p className="text-2xl font-semibold text-white mt-1.5 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs mt-1.5 font-medium",
                trend.value >= 0 ? "text-emerald-300" : "text-rose-300"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
            <Icon className="w-4 h-4 text-slate-300" strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
