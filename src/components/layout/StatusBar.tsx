import { Sparkles, Cpu, Radio, CloudSun } from "lucide-react";

type Tone = "emerald" | "amber" | "lime" | "sky" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  emerald: "border-emerald-400/30 text-emerald-200 bg-emerald-400/5",
  amber:   "border-amber-400/30  text-amber-200   bg-amber-400/5",
  lime:    "border-lime-400/30   text-lime-200    bg-lime-400/5",
  sky:     "border-sky-400/30    text-sky-200     bg-sky-400/5",
  muted:   "border-white/10      text-slate-400   bg-white/[0.02]",
};

interface ChipProps {
  icon:  React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone:  Tone;
  pulse?: boolean;
}

function Chip({ icon: Icon, label, tone, pulse }: ChipProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {pulse && (
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {!pulse && <Icon size={11} />}
      {label}
    </span>
  );
}

export default function StatusBar() {
  const weatherProvider = (process.env.WEATHER_PROVIDER ?? "simulation").toLowerCase();
  const weatherLive     = weatherProvider === "openweather"
                          && (process.env.OPENWEATHER_API_KEY ?? "").trim().length > 0;
  const deviceReady     = (process.env.FERTILAI_DEVICE_API_KEY ?? "").trim().length > 0;

  return (
    <div
      data-print-hide
      className="hidden md:block border-b border-white/[0.05] bg-white/[0.015] backdrop-blur-sm print:hidden"
    >
      <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto">
        <Chip icon={Sparkles}  label="AI Monitoring Active"
              tone="emerald" pulse />
        <Chip icon={Cpu}       label="Simulation Mode"
              tone="amber" />
        <Chip icon={Radio}     label={deviceReady ? "Device API Ready" : "Device API Disabled"}
              tone={deviceReady ? "lime" : "muted"} />
        <Chip icon={CloudSun}  label={weatherLive ? "Live Weather Feed" : "Sim Weather Stream"}
              tone={weatherLive ? "sky" : "amber"} />
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap">
          Seranova Platform
        </span>
      </div>
    </div>
  );
}
