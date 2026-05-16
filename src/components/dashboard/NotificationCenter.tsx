import Link from "next/link";
import {
  NOTIFICATION_SEVERITY_META,
  NOTIFICATION_TYPE_LABELS,
  notificationHref,
} from "@/lib/notification-engine";
import type {
  NotificationType,
  NotificationSeverity,
  NotificationSource,
} from "@/generated/prisma/client";
import {
  Bell,
  CheckCircle2,
  Thermometer,
  CloudSun,
  Cog,
  Sparkles,
  Info,
} from "lucide-react";

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ size?: number; className?: string }>> = {
  SENSOR_ALERT:      Thermometer,
  WEATHER_ALERT:     CloudSun,
  AUTOMATION_EVENT:  Cog,
  AI_RECOMMENDATION: Sparkles,
  SYSTEM:            Info,
};

export interface NotificationItem {
  id:                       string;
  title:                    string;
  message:                  string;
  type:                     NotificationType;
  severity:                 NotificationSeverity;
  source:                   NotificationSource;
  isRead:                   boolean;
  relatedFieldId:           string | null;
  relatedAnalysisId:        string | null;
  relatedRecommendationId:  string | null;
  createdAt:                string;
}

function fmtNotifDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day:    "numeric",
    month:  "short",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function NotificationCenter({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount:   number;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-lime-300" />
          <span className="text-sm font-semibold text-white/95">Bildirim Merkezi</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30">
              {unreadCount} yeni
            </span>
          )}
        </div>
        <Link
          href="/dashboard/farmer/notifications"
          className="text-xs font-medium text-lime-300 hover:text-lime-200"
        >
          Tümünü gör →
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <CheckCircle2 size={28} className="text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/70">Bildirim yok</p>
          <p className="text-xs text-white/40 mt-0.5">Yeni alarmlar ve öneriler burada görünecek.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {notifications.map((n) => {
            const sev = NOTIFICATION_SEVERITY_META[n.severity];
            const Icon = TYPE_ICONS[n.type];
            const href = notificationHref(n);
            return (
              <li key={n.id} className={`px-4 py-3 hover:bg-white/5 transition-colors ${!n.isRead ? "bg-lime-400/5" : ""}`}>
                <Link href={href} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg border ${sev.tone} shrink-0`}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm leading-tight ${!n.isRead ? "font-semibold text-white/95" : "font-medium text-white/80"} truncate`}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />}
                    </div>
                    <p className="text-xs text-white/55 line-clamp-2 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                      <span>{NOTIFICATION_TYPE_LABELS[n.type]}</span>
                      <span>·</span>
                      <span>{fmtNotifDate(n.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
