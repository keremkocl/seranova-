import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_SEVERITY_META,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_SOURCE_LABELS,
  notificationHref,
} from "@/lib/notification-engine";
import type {
  NotificationType,
  NotificationSeverity,
} from "@prisma/client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "./actions";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Thermometer,
  CloudSun,
  Cog,
  Sparkles,
  Info,
  ArrowRight,
} from "lucide-react";

type Filter = "all" | "unread" | "critical";

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ size?: number; className?: string }>> = {
  SENSOR_ALERT:      Thermometer,
  WEATHER_ALERT:     CloudSun,
  AUTOMATION_EVENT:  Cog,
  AI_RECOMMENDATION: Sparkles,
  SYSTEM:            Info,
};

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const sp = await searchParams;
  const filter: Filter = sp.filter === "unread" || sp.filter === "critical" ? sp.filter : "all";

  const where = {
    userId,
    ...(filter === "unread"   ? { isRead: false } : {}),
    ...(filter === "critical" ? { severity: "CRITICAL" as NotificationSeverity } : {}),
  };

  const [items, unreadCount, criticalCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.count({ where: { userId, severity: "CRITICAL" } }),
  ]);

  const TABS: { value: Filter; label: string; count?: number }[] = [
    { value: "all",      label: "Tümü"                                    },
    { value: "unread",   label: "Okunmamış", count: unreadCount           },
    { value: "critical", label: "Kritik",    count: criticalCount         },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/80 mb-1">Alert Center</p>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={18} className="text-lime-300" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Bildirimler</h1>
          </div>
          <p className="text-sm text-white/55">
            {unreadCount > 0
              ? `${unreadCount} okunmamış bildiriminiz var.`
              : "Tüm bildirimleriniz okundu."}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={async () => { "use server"; await markAllNotificationsReadAction(); }}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <CheckCheck size={14} /> Tümünü okundu işaretle
            </button>
          </form>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-gray-100">
        {TABS.map((t) => {
          const active = t.value === filter;
          return (
            <Link
              key={t.value}
              href={`/dashboard/farmer/notifications${t.value === "all" ? "" : `?filter=${t.value}`}`}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                active
                  ? "border-green-600 text-green-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>{t.count}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <CheckCircle2 size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === "unread"   ? "Okunmamış bildirim yok"
             : filter === "critical" ? "Kritik bildirim yok"
             : "Henüz bildirim yok"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const sev = NOTIFICATION_SEVERITY_META[n.severity];
            const Icon = TYPE_ICONS[n.type];
            const href = notificationHref(n);
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  !n.isRead ? "border-amber-200 bg-amber-50/30" : "border-gray-100 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg border shrink-0 ${sev.tone}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className={`text-sm leading-tight ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {n.title}
                    </p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sev.tone}`}>
                      {sev.label}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {NOTIFICATION_TYPE_LABELS[n.type]}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Kaynak: {NOTIFICATION_SOURCE_LABELS[n.source]}
                    </span>
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{fmtDateTime(n.createdAt)}</span>
                    {n.relatedFieldId          && <span>· Alan: {n.relatedFieldId.slice(0, 8)}…</span>}
                    {n.relatedRecommendationId && <span>· Öneri: {n.relatedRecommendationId.slice(0, 8)}…</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                  >
                    Aç <ArrowRight size={11} />
                  </Link>
                  {!n.isRead && (
                    <form action={async () => { "use server"; await markNotificationReadAction(n.id); }}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                      >
                        <CheckCircle2 size={11} /> Okundu
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
