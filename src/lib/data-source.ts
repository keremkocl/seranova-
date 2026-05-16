import type { SensorDataSource, WeatherDataSource } from "@/generated/prisma/client";

export type SensorSourceMeta = {
  label:   string;
  short:   string;
  tone:    string;
  dot:     string;
  isLive:  boolean;
};

export type WeatherSourceMeta = {
  label: string;
  short: string;
  tone:  string;
  isLive: boolean;
};

export const SENSOR_SOURCE_META: Record<SensorDataSource, SensorSourceMeta> = {
  SIMULATION: {
    label:  "Simulation Mode Active",
    short:  "Simulation Mode",
    tone:   "bg-amber-500/10 text-amber-300 border-amber-400/30",
    dot:    "bg-amber-400",
    isLive: false,
  },
  MANUAL: {
    label:  "Manuel giriş",
    short:  "Manuel",
    tone:   "bg-white/5 text-white/60 border-white/15",
    dot:    "bg-white/40",
    isLive: false,
  },
  DEVICE_API: {
    label:  "Live Device Data",
    short:  "Live Device",
    tone:   "bg-lime-400/15 text-lime-200 border-lime-300/40",
    dot:    "bg-lime-300 animate-pulse",
    isLive: true,
  },
};

export const WEATHER_SOURCE_META: Record<WeatherDataSource, WeatherSourceMeta> = {
  SIMULATION: {
    label:  "Demo Weather Stream",
    short:  "Sim Weather",
    tone:   "bg-amber-500/10 text-amber-300 border-amber-400/30",
    isLive: false,
  },
  MANUAL: {
    label:  "Manuel giriş",
    short:  "Manuel",
    tone:   "bg-white/5 text-white/60 border-white/15",
    isLive: false,
  },
  EXTERNAL_API: {
    label:  "Live Weather Feed",
    short:  "Live Weather",
    tone:   "bg-sky-400/15 text-sky-200 border-sky-300/40",
    isLive: true,
  },
};

export function describeSensorSource(source: SensorDataSource | null | undefined, deviceId?: string | null): string {
  if (!source) return SENSOR_SOURCE_META.SIMULATION.label;
  const meta = SENSOR_SOURCE_META[source];
  if (source === "DEVICE_API" && deviceId) return `${meta.label} · ${deviceId}`;
  return meta.label;
}

export function describeWeatherSource(source: WeatherDataSource | null | undefined, provider?: string | null): string {
  if (!source) return WEATHER_SOURCE_META.SIMULATION.label;
  const meta = WEATHER_SOURCE_META[source];
  if (source === "EXTERNAL_API" && provider) return `${meta.label} · ${provider}`;
  return meta.label;
}
