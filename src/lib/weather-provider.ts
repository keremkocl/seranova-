import type { WeatherCondition, WeatherDataSource } from "@/generated/prisma/client";

export interface FieldGeo {
  id:          string;
  name:        string;
  locationLat: number | null;
  locationLng: number | null;
}

export interface WeatherSnapshot {
  outsideTemperature: number;
  outsideHumidity:    number;
  rainChance:         number;
  windSpeed:          number;
  solarRadiation:     number;
  condition:          WeatherCondition;
  source:             WeatherDataSource;
  provider:           string;
}

function getDefaultCoords(): { lat: number; lon: number } {
  return {
    lat: Number(process.env.DEFAULT_WEATHER_LAT ?? "36.8969"),
    lon: Number(process.env.DEFAULT_WEATHER_LON ?? "30.7133"),
  };
}

/**
 * Resolve the configured weather provider for the current request.
 * Returns "openweather" only when both the provider env and the API key are set;
 * otherwise falls back to "simulation".
 */
function activeProvider(): "openweather" | "simulation" {
  const provider = (process.env.WEATHER_PROVIDER ?? "simulation").toLowerCase();
  if (provider === "openweather" && (process.env.OPENWEATHER_API_KEY ?? "").trim().length > 0) {
    return "openweather";
  }
  return "simulation";
}

export function isExternalWeatherConfigured(): boolean {
  return activeProvider() === "openweather";
}

/**
 * Single public entry point — server callers should use this rather than
 * touching individual providers. If the external provider fails, the
 * simulation is used so the UI never breaks.
 */
export async function getWeatherForField(field: FieldGeo): Promise<WeatherSnapshot> {
  if (activeProvider() === "openweather") {
    const lat = field.locationLat ?? getDefaultCoords().lat;
    const lon = field.locationLng ?? getDefaultCoords().lon;
    try {
      return await fetchOpenWeather(lat, lon);
    } catch (e) {
      console.warn("[weather-provider] external fetch failed, falling back to simulation:", e);
      return simulateWeather(field);
    }
  }
  return simulateWeather(field);
}

// ─── External: OpenWeather ─────────────────────────────────────────────────

const OW_CONDITION_MAP: Record<string, WeatherCondition> = {
  Clear:        "SUNNY",
  Clouds:       "CLOUDY",
  Rain:         "RAINY",
  Drizzle:      "RAINY",
  Thunderstorm: "STORMY",
  Snow:         "RAINY",
  Mist:         "CLOUDY",
  Fog:          "CLOUDY",
  Haze:         "CLOUDY",
  Smoke:        "CLOUDY",
  Squall:       "WINDY",
  Tornado:      "STORMY",
};

interface OpenWeatherResponse {
  main?:    { temp?: number; humidity?: number };
  wind?:    { speed?: number };
  clouds?:  { all?:  number };
  rain?:    { "1h"?: number; "3h"?: number };
  weather?: Array<{ main?: string }>;
}

async function fetchOpenWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const apiKey = process.env.OPENWEATHER_API_KEY!;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=tr`;

  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`OpenWeather HTTP ${res.status}`);
  const data = (await res.json()) as OpenWeatherResponse;

  const condRaw = data.weather?.[0]?.main ?? "Clear";
  const condition = OW_CONDITION_MAP[condRaw] ?? "SUNNY";

  // OpenWeather "current" doesn't expose pop directly; approximate from clouds + active rain.
  const rainNow   = data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0;
  const clouds    = data.clouds?.all ?? 0;
  const rainChance = rainNow > 0
    ? Math.min(95, 70 + rainNow * 5)
    : Math.min(80, clouds * 0.6);

  return {
    outsideTemperature: data.main?.temp     ?? 20,
    outsideHumidity:    data.main?.humidity ?? 50,
    rainChance,
    windSpeed:          (data.wind?.speed ?? 0) * 3.6, // m/s → km/h
    solarRadiation:     estimateSolarRadiation(condition),
    condition,
    source:             "EXTERNAL_API",
    provider:           "OpenWeatherMap",
  };
}

function estimateSolarRadiation(c: WeatherCondition): number {
  // Hour-of-day weighted clear-sky estimate, then attenuate by condition.
  const h = new Date().getHours();
  const daylight = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));   // 0 at 6am/6pm, 1 at noon
  const clearSky = 850 * daylight;
  const attenuation: Record<WeatherCondition, number> = {
    SUNNY: 1.0, CLOUDY: 0.55, RAINY: 0.25, WINDY: 0.85, STORMY: 0.15,
  };
  return Math.round(clearSky * attenuation[c]);
}

// ─── Internal: Simulation ──────────────────────────────────────────────────

function simulateWeather(field: FieldGeo): WeatherSnapshot {
  // Lightly varied each call so /api/weather/sync produces different snapshots.
  const r = Math.random;
  const temp   = 16 + r() * 18;          // 16–34 °C (occasionally crosses 30 → triggers WARNING)
  const hum    = 35 + r() * 50;          // 35–85 %
  const rain   = r() * 100;              // 0–100 % (so high-rain notifications fire sometimes)
  const wind   = r() * 45;
  const solar  = 150 + r() * 700;
  const c      = rain > 75 ? "RAINY"
               : rain > 45 ? "CLOUDY"
               : wind > 35 ? "WINDY"
               : "SUNNY";

  return {
    outsideTemperature: round1(temp),
    outsideHumidity:    Math.round(hum),
    rainChance:         Math.round(rain),
    windSpeed:          Math.round(wind),
    solarRadiation:     Math.round(solar),
    condition:          c,
    source:             "SIMULATION",
    provider:           `Demo Generator (${field.name})`,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
