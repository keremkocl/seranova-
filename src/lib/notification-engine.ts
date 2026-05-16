import { prisma } from "@/lib/prisma";
import type {
  Notification,
  NotificationType,
  NotificationSeverity,
  NotificationSource,
} from "@/generated/prisma/client";
import type { SensorSnapshot } from "@/lib/automation-engine";

// Dedup window: avoid spamming the same alert for the same field repeatedly
const DEDUP_WINDOW_MIN = 30;

export interface CreateNotificationInput {
  userId:                  string;
  title:                   string;
  message:                 string;
  type:                    NotificationType;
  severity?:               NotificationSeverity;
  source?:                 NotificationSource;
  relatedFieldId?:         string | null;
  relatedAnalysisId?:      string | null;
  relatedRecommendationId?: string | null;
  /** When true (default), suppress duplicates within DEDUP_WINDOW_MIN. */
  dedup?: boolean;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const severity = input.severity ?? "INFO";
  const source   = input.source   ?? "SYSTEM";
  const dedup    = input.dedup    ?? true;

  if (dedup) {
    const since = new Date(Date.now() - DEDUP_WINDOW_MIN * 60_000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId:         input.userId,
        title:          input.title,
        type:           input.type,
        severity,
        relatedFieldId: input.relatedFieldId ?? null,
        createdAt:      { gte: since },
      },
    });
    if (existing) return existing;
  }

  return prisma.notification.create({
    data: {
      userId:                  input.userId,
      title:                   input.title,
      message:                 input.message,
      type:                    input.type,
      severity,
      source,
      relatedFieldId:          input.relatedFieldId          ?? null,
      relatedAnalysisId:       input.relatedAnalysisId       ?? null,
      relatedRecommendationId: input.relatedRecommendationId ?? null,
    },
  });
}

/**
 * Translate a SensorSnapshot into notification(s) following the project rules:
 * - temperature  > 35   → CRITICAL
 * - temperature  > 30   → WARNING
 * - soilMoisture < 45   → WARNING
 * - pH outside [5.5, 7.5] → WARNING
 * Returns the number of notifications actually persisted (after dedup).
 */
export async function createSensorAlert(
  userId: string,
  fieldId: string,
  sensor: SensorSnapshot,
  source: NotificationSource = "SIMULATION",
): Promise<number> {
  let created = 0;
  const fire = async (n: Omit<CreateNotificationInput, "userId" | "relatedFieldId">) => {
    const before = await prisma.notification.findFirst({
      where: {
        userId, title: n.title, type: n.type, severity: n.severity ?? "INFO",
        relatedFieldId: fieldId,
        createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MIN * 60_000) },
      },
    });
    if (before) return;
    await createNotification({ ...n, userId, relatedFieldId: fieldId, source, dedup: false });
    created++;
  };

  if (sensor.temperature != null) {
    if (sensor.temperature > 35) {
      await fire({
        title:    "Kritik sıcaklık alarmı",
        message:  `Sera sıcaklığı ${sensor.temperature.toFixed(1)}°C — bitki yanma riski yüksek. Acil havalandırma!`,
        type:     "SENSOR_ALERT",
        severity: "CRITICAL",
      });
    } else if (sensor.temperature > 30) {
      await fire({
        title:    "Yüksek sıcaklık uyarısı",
        message:  `Sera sıcaklığı ${sensor.temperature.toFixed(1)}°C — eşik aşıldı, havalandırmayı kontrol edin.`,
        type:     "SENSOR_ALERT",
        severity: "WARNING",
      });
    }
  }

  if (sensor.soilMoisture != null && sensor.soilMoisture < 45) {
    await fire({
      title:    "Düşük toprak nemi",
      message:  `Toprak nemi %${sensor.soilMoisture.toFixed(0)} — sulama gerekebilir.`,
      type:     "SENSOR_ALERT",
      severity: "WARNING",
    });
  }

  if (sensor.ph != null && (sensor.ph < 5.5 || sensor.ph > 7.5)) {
    await fire({
      title:    "pH aralık dışı",
      message:  `Toprak pH'ı ${sensor.ph.toFixed(1)} — besin alımı etkilenebilir.`,
      type:     "SENSOR_ALERT",
      severity: "WARNING",
    });
  }

  return created;
}

export async function createAutomationNotification(opts: {
  userId:    string;
  fieldId:   string;
  title:     string;
  message:   string;
  severity?: NotificationSeverity;
  source?:   NotificationSource;
}): Promise<Notification> {
  return createNotification({
    userId:         opts.userId,
    title:          opts.title,
    message:        opts.message,
    type:           "AUTOMATION_EVENT",
    severity:       opts.severity ?? "INFO",
    source:         opts.source   ?? "USER_ACTION",
    relatedFieldId: opts.fieldId,
    dedup:          false,
  });
}

export async function createRecommendationNotification(opts: {
  userId:           string;
  recommendationId: string;
  title:            string;
  fieldId?:         string | null;
}): Promise<Notification> {
  return createNotification({
    userId:                  opts.userId,
    title:                   "Yeni AI önerisi hazır",
    message:                 `${opts.title} — fertigation reçetenizi inceleyebilirsiniz.`,
    type:                    "AI_RECOMMENDATION",
    severity:                "INFO",
    source:                  "SYSTEM",
    relatedRecommendationId: opts.recommendationId,
    relatedFieldId:          opts.fieldId ?? null,
    dedup:                   false,
  });
}

// ─── Helpers for UI ────────────────────────────────────────────────────────

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  SENSOR_ALERT:      "Sensör Alarmı",
  WEATHER_ALERT:     "Hava Uyarısı",
  AUTOMATION_EVENT:  "Otomasyon",
  AI_RECOMMENDATION: "AI Önerisi",
  SYSTEM:            "Sistem",
};

export const NOTIFICATION_SEVERITY_META: Record<NotificationSeverity, { label: string; tone: string; dot: string }> = {
  INFO:     { label: "Bilgi",  tone: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500"   },
  WARNING:  { label: "Uyarı",  tone: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  CRITICAL: { label: "Kritik", tone: "bg-red-50 text-red-700 border-red-200",       dot: "bg-red-500"   },
};

export const NOTIFICATION_SOURCE_LABELS: Record<NotificationSource, string> = {
  SIMULATION:  "Simülasyon",
  DEVICE_API:  "Cihaz",
  SYSTEM:      "Sistem",
  USER_ACTION: "Kullanıcı",
};

export function notificationHref(n: {
  type: NotificationType;
  relatedRecommendationId: string | null;
  relatedAnalysisId:       string | null;
  relatedFieldId:          string | null;
}): string {
  if (n.type === "AI_RECOMMENDATION" && n.relatedRecommendationId) {
    return `/dashboard/farmer/recommendations/${n.relatedRecommendationId}`;
  }
  if (n.relatedAnalysisId) {
    return `/dashboard/farmer/analyses/${n.relatedAnalysisId}`;
  }
  if (n.type === "SENSOR_ALERT" || n.type === "WEATHER_ALERT" || n.type === "AUTOMATION_EVENT") {
    return `/dashboard/farmer/analytics`;
  }
  return `/dashboard/farmer/notifications`;
}
