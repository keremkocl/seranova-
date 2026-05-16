export type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface SensorSnapshot {
  temperature:  number | null;
  humidity:     number | null;
  soilMoisture: number | null;
  lightLevel:   number | null; // stored in lux
  ec:           number | null;
  ph:           number | null;
}

export interface DeviceState {
  irrigationOn:  boolean;
  ventilationOn: boolean;
  lightingOn:    boolean;
}

export interface EngineEvent {
  type:     string;
  message:  string;
  severity: Severity;
}

export interface EngineAlert {
  message:  string;
  severity: Severity;
}

export interface EngineResult {
  devices: DeviceState;
  events:  EngineEvent[];
  alerts:  EngineAlert[];
}

export interface WeatherSnapshot {
  outsideTemperature: number | null;
  solarRadiation:     number | null;
  windSpeed:          number | null;
}

export function runAutomation(s: SensorSnapshot, weather?: WeatherSnapshot): EngineResult {
  const devices: DeviceState = { irrigationOn: false, ventilationOn: false, lightingOn: false };
  const events:  EngineEvent[]  = [];
  const alerts:  EngineAlert[]  = [];

  // Outdoor heat raises ventilation threshold from 27°C down to 25°C
  const ventTempThreshold = (weather?.outsideTemperature ?? 0) > 30 ? 25 : 27;
  // Low solar radiation raises lighting threshold from 40 klux to 50 klux
  const lightLuxThreshold = (weather?.solarRadiation ?? 999) < 200 ? 50000 : 40000;

  // ── Temperature ──────────────────────────────────────────────────────────
  if (s.temperature !== null) {
    if (s.temperature > 32) {
      devices.ventilationOn = true;
      events.push({ type: "VENTILATION_ON_CRITICAL_TEMP", message: `Kritik sıcaklık (${s.temperature.toFixed(1)}°C)! Havalandırma acil açıldı.`, severity: "CRITICAL" });
      alerts.push({ message: `Kritik sıcaklık ${s.temperature.toFixed(1)}°C — bitki yanma riski!`, severity: "CRITICAL" });
    } else if (s.temperature > ventTempThreshold) {
      devices.ventilationOn = true;
      const outdoorNote = ventTempThreshold < 27 ? " (dış sıcaklık yüksek — eşik düşürüldü)" : "";
      events.push({ type: "VENTILATION_ON", message: `Sıcaklık yüksek (${s.temperature.toFixed(1)}°C). Havalandırma açıldı${outdoorNote}.`, severity: "WARNING" });
      alerts.push({ message: `Sıcaklık ${s.temperature.toFixed(1)}°C — eşik aşıldı (${ventTempThreshold}°C)${outdoorNote}`, severity: "WARNING" });
    }
  }

  // ── Humidity ─────────────────────────────────────────────────────────────
  if (s.humidity !== null && s.humidity > 80) {
    devices.ventilationOn = true;
    events.push({ type: "VENTILATION_ON_HUMIDITY", message: `Nem çok yüksek (%${s.humidity.toFixed(0)}). Havalandırma açıldı.`, severity: "WARNING" });
    alerts.push({ message: `Nem %${s.humidity.toFixed(0)} — fungal hastalık riski`, severity: "WARNING" });
  }

  // ── Soil moisture ─────────────────────────────────────────────────────────
  if (s.soilMoisture !== null) {
    if (s.soilMoisture < 40) {
      devices.irrigationOn = true;
      events.push({ type: "IRRIGATION_ON_CRITICAL", message: `Toprak nemi kritik (%${s.soilMoisture.toFixed(0)}). Sulama acil başlatıldı.`, severity: "CRITICAL" });
      alerts.push({ message: `Toprak nemi %${s.soilMoisture.toFixed(0)} — kritik kuraklık!`, severity: "CRITICAL" });
    } else if (s.soilMoisture < 55) {
      devices.irrigationOn = true;
      events.push({ type: "IRRIGATION_ON", message: `Toprak nemi düşük (%${s.soilMoisture.toFixed(0)}). Sulama başlatıldı.`, severity: "INFO" });
      alerts.push({ message: `Toprak nemi %${s.soilMoisture.toFixed(0)} — sulama gerekli`, severity: "WARNING" });
    }
  }

  // ── Light level ───────────────────────────────────────────────────────────
  if (s.lightLevel !== null && s.lightLevel < lightLuxThreshold) {
    devices.lightingOn = true;
    const solarNote = lightLuxThreshold > 40000 ? " (düşük güneş radyasyonu — eşik yükseltildi)" : "";
    events.push({ type: "LIGHTING_ON", message: `Işık seviyesi düşük (${(s.lightLevel / 1000).toFixed(0)} klux). Yapay aydınlatma açıldı${solarNote}.`, severity: "INFO" });
    alerts.push({ message: `Işık seviyesi ${(s.lightLevel / 1000).toFixed(0)} klux — fotosentez yetersiz${solarNote}`, severity: "WARNING" });
  }

  // ── EC ────────────────────────────────────────────────────────────────────
  if (s.ec !== null && s.ec > 3.5) {
    alerts.push({ message: `EC ${s.ec.toFixed(1)} dS/m — tuz stresi riski`, severity: "CRITICAL" });
  } else if (s.ec !== null && s.ec > 2.8) {
    alerts.push({ message: `EC ${s.ec.toFixed(1)} dS/m — yüksek tuz yükü`, severity: "WARNING" });
  }

  // ── pH ────────────────────────────────────────────────────────────────────
  if (s.ph !== null && (s.ph < 5.5 || s.ph > 7.5)) {
    alerts.push({ message: `pH ${s.ph.toFixed(1)} — aralık dışı, besin alımı etkilenebilir`, severity: "WARNING" });
  }

  return { devices, events, alerts };
}
