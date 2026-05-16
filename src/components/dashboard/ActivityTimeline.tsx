interface TimelineEvent {
  id:        string;
  type:      string;
  message:   string;
  severity:  string;
  createdAt: string; // ISO string
}

const SEVERITY = {
  INFO:     { dot: "bg-blue-400",  text: "text-blue-600",  ring: "ring-blue-100",  label: "Bilgi"   },
  WARNING:  { dot: "bg-amber-400", text: "text-amber-700", ring: "ring-amber-100", label: "Uyarı"   },
  CRITICAL: { dot: "bg-red-500",   text: "text-red-700",   ring: "ring-red-100",   label: "Kritik"  },
} as const;

const TYPE_ICONS: Record<string, string> = {
  VENTILATION_ON:           "💨",
  VENTILATION_ON_HUMIDITY:  "💨",
  VENTILATION_ON_CRITICAL_TEMP: "🔥",
  IRRIGATION_ON:            "💧",
  IRRIGATION_ON_CRITICAL:   "💧",
  LIGHTING_ON:              "💡",
  MODE_CHANGED_TO_AUTO:     "🤖",
  MODE_CHANGED_TO_MANUAL:   "🎛️",
  TEMPERATURE_ALERT:        "🌡️",
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export default function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">Henüz otomasyon olayı yok.</p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-100" />

      {events.map((ev, i) => {
        const sev = SEVERITY[ev.severity as keyof typeof SEVERITY] ?? SEVERITY.INFO;
        const icon = TYPE_ICONS[ev.type] ?? "•";
        const isLast = i === events.length - 1;

        return (
          <div key={ev.id} className={`relative flex items-start gap-4 pl-8 ${isLast ? "pb-0" : "pb-4"}`}>
            {/* Dot */}
            <div
              className={`absolute left-2 top-1.5 w-3 h-3 rounded-full ring-4 ${sev.dot} ${sev.ring} flex-shrink-0 z-10`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm">{icon}</span>
                <p className="text-sm text-gray-800 leading-snug">{ev.message}</p>
                <span
                  className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${sev.text} bg-opacity-10 ${sev.ring} ring-1`}
                >
                  {sev.label}
                </span>
              </div>
              <p className="text-xs text-gray-400">{fmtTime(ev.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
