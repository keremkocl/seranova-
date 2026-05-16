import { GROWTH_STAGE_LABELS } from "@/lib/recommendation-engine";
import type { GrowthStage } from "@/lib/recommendation-engine";

// ─── Input types ─────────────────────────────────────────────────────────────

export interface SensorInput {
  temperature:  number | null;
  humidity:     number | null;
  ph:           number | null;
  ec:           number | null;
  lightLevel:   number | null; // lux
  soilMoisture: number | null;
  irrigationOn:  boolean;
  ventilationOn: boolean;
}

export interface SoilInput {
  ph:            number | null;
  ec:            number | null;
  nitrogen:      number | null;
  phosphorus:    number | null;
  potassium:     number | null;
  organicMatter: number | null;
}

export interface WaterInput {
  ph: number | null;
  ec: number | null;
}

export interface WeatherInput {
  outsideTemperature: number | null;
  outsideHumidity:    number | null;
  rainChance:         number | null; // 0–100 %
  windSpeed:          number | null; // km/h
  solarRadiation:     number | null; // W/m²
  condition:          string;        // SUNNY | CLOUDY | RAINY | WINDY | STORMY
}

export interface CropInput {
  name:            string;
  growthStage:     string;
  plantedAt:       Date | null;
  expectedHarvest: Date | null;
  plantCount:      number | null;
}

export interface EngineInput {
  sensor:         SensorInput  | null;
  soil:           SoilInput    | null;
  water:          WaterInput   | null;
  weather:        WeatherInput | null;
  crop:           CropInput    | null;
  automationMode: "AUTO" | "MANUAL";
  warningCount:   number;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export type AISeverity = "ok" | "warn" | "critical" | "info";

export interface InsightCard {
  id:       string;
  emoji:    string;
  title:    string;
  body:     string;
  severity: AISeverity;
  metric:   string;
  value:    string;
}

export interface RecommendationCard {
  id:            string;
  category:      "climate" | "irrigation" | "fertilization" | "risk";
  title:         string;
  body:          string;
  confidence:    number; // 0–100
  severity:      AISeverity;
  relatedMetric: string;
}

export interface MockQA {
  question: string;
  answer:   string;
}

export interface AssistantOutput {
  insights:        InsightCard[];
  recommendations: RecommendationCard[];
  mockAnswers:     MockQA[];
  topInsight:      InsightCard | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function stageName(stage: string) {
  return GROWTH_STAGE_LABELS[stage as GrowthStage] ?? stage;
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// ─── Insight generators ───────────────────────────────────────────────────────

function temperatureInsight(t: number | null): InsightCard {
  if (t === null) return { id: "temp", emoji: "🌡️", title: "Sıcaklık", body: "Sıcaklık verisi alınamadı.", severity: "info", metric: "Sıcaklık", value: "—" };
  let severity: AISeverity = "ok";
  let body: string;
  if (t > 32)      { severity = "critical"; body = `Sıcaklık kritik (${t.toFixed(1)}°C). Bitki yanma riski! Havalandırmayı maksimuma alın, gölge örtüsü kullanın.`; }
  else if (t > 27) { severity = "warn";     body = `Sıcaklık yüksek (${t.toFixed(1)}°C). Havalandırma sistemi aktif tutulmalı, bitki stresini izleyin.`; }
  else if (t < 15) { severity = "warn";     body = `Sıcaklık düşük (${t.toFixed(1)}°C). Soğuklama stresi riski. Isıtmayı değerlendirin.`; }
  else             { severity = "ok";       body = `Sıcaklık ${t.toFixed(1)}°C ile ideal aralıkta. Sera iklimi dengeli.`; }
  return { id: "temp", emoji: "🌡️", title: "Sıcaklık Durumu", body, severity, metric: "Sıcaklık", value: `${t.toFixed(1)} °C` };
}

function humidityInsight(h: number | null): InsightCard {
  if (h === null) return { id: "hum", emoji: "💧", title: "Nem", body: "Nem verisi alınamadı.", severity: "info", metric: "Nem", value: "—" };
  let severity: AISeverity = "ok";
  let body: string;
  if (h > 85)      { severity = "critical"; body = `Nem çok yüksek (%${h.toFixed(0)}). Fungal hastalık riski var! Havalandırmayı artırın.`; }
  else if (h > 75) { severity = "warn";     body = `Nem yüksek (%${h.toFixed(0)}). Küf ve mantar gelişim riski. Havalandırma açık tutulmalı.`; }
  else if (h < 50) { severity = "warn";     body = `Nem düşük (%${h.toFixed(0)}). Bitki su kaybı artabilir. Sulama takvimini gözden geçirin.`; }
  else             { severity = "ok";       body = `Nem %${h.toFixed(0)} ile ideal aralıkta (60–75%). Özel müdahale gerekmiyor.`; }
  return { id: "hum", emoji: "💦", title: "Nem Durumu", body, severity, metric: "Nem", value: `%${h.toFixed(0)}` };
}

function phInsight(ph: number | null, source: "sensor" | "soil" = "sensor"): InsightCard {
  const label = source === "soil" ? "Toprak pH" : "pH";
  if (ph === null) return { id: "ph", emoji: "⚗️", title: `${label} Dengesi`, body: "pH verisi mevcut değil.", severity: "info", metric: label, value: "—" };
  let severity: AISeverity = "ok";
  let body: string;
  if (ph < 5.5 || ph > 7.8) { severity = "critical"; body = `pH ${ph.toFixed(1)} aralık dışında. Besin alımı ciddi şekilde kısıtlanmış. Acil düzeltme gerekli.`; }
  else if (ph < 6.0 || ph > 7.2) { severity = "warn"; body = `pH ${ph.toFixed(1)} optimal aralığın (6.0–7.0) kenarında. Kireçleme veya asitleme değerlendirin.`; }
  else { severity = "ok"; body = `pH ${ph.toFixed(1)} optimal aralıkta (6.0–7.0). Besin alımı etkilenmiyor.`; }
  return { id: "ph", emoji: "⚗️", title: `${label} Dengesi`, body, severity, metric: label, value: ph.toFixed(1) };
}

function ecInsight(ec: number | null): InsightCard {
  if (ec === null) return { id: "ec", emoji: "⚡", title: "EC / Tuzluluk", body: "EC verisi mevcut değil.", severity: "info", metric: "EC", value: "—" };
  let severity: AISeverity = "ok";
  let body: string;
  if (ec > 3.5)     { severity = "critical"; body = `EC ${ec.toFixed(1)} dS/m — kritik yüksek! Tuz stresi ciddi hasar verebilir. Yıkama sulaması uygulayın.`; }
  else if (ec > 3.0){ severity = "warn";     body = `EC ${ec.toFixed(1)} dS/m — yüksek. Gübre dozunu azaltın ve sulama sıklığını artırın.`; }
  else if (ec < 1.0){ severity = "warn";     body = `EC ${ec.toFixed(1)} dS/m — düşük. Besin konsantrasyonu yetersiz. Gübre programını güçlendirin.`; }
  else              { severity = "ok";       body = `EC ${ec.toFixed(1)} dS/m normal aralıkta (1.0–3.0). Tuzlanma riski yok.`; }
  return { id: "ec", emoji: "⚡", title: "EC / Tuzluluk", body, severity, metric: "EC", value: `${ec.toFixed(1)} dS/m` };
}

function soilMoistureInsight(sm: number | null): InsightCard {
  if (sm === null) return { id: "soil", emoji: "🌱", title: "Toprak Nemi", body: "Toprak nemi verisi yok.", severity: "info", metric: "Toprak Nemi", value: "—" };
  let severity: AISeverity = "ok";
  let body: string;
  if (sm < 40)     { severity = "critical"; body = `Toprak nemi %${sm.toFixed(0)} — kritik kuraklık! Sulama acil gerekli, bitki solma riski var.`; }
  else if (sm < 55){ severity = "warn";     body = `Toprak nemi %${sm.toFixed(0)} düşük. Sulama sistemi aktif tutulmalı. Hedef: %60–75.`; }
  else if (sm > 90){ severity = "warn";     body = `Toprak nemi %${sm.toFixed(0)} çok yüksek. Kök çürüklüğü riski. Sulamayı azaltın.`; }
  else             { severity = "ok";       body = `Toprak nemi %${sm.toFixed(0)} ile yeterli düzeyde. Sulama dengeli seyrediyor.`; }
  return { id: "soil", emoji: "🌱", title: "Toprak Nemi", body, severity, metric: "Toprak Nemi", value: `%${sm.toFixed(0)}` };
}

function lightInsight(lux: number | null): InsightCard {
  if (lux === null) return { id: "light", emoji: "☀️", title: "Işık Seviyesi", body: "Işık verisi mevcut değil.", severity: "info", metric: "Işık", value: "—" };
  const klux = lux / 1000;
  let severity: AISeverity = "ok";
  let body: string;
  if (klux < 20)     { severity = "critical"; body = `Işık seviyesi ${klux.toFixed(0)} klux — çok düşük. Fotosentez ciddi kısıtlı. Yapay aydınlatmayı artırın.`; }
  else if (klux < 40){ severity = "warn";     body = `Işık seviyesi ${klux.toFixed(0)} klux — yetersiz. Yapay aydınlatma devreye alınmalı.`; }
  else               { severity = "ok";       body = `Işık seviyesi ${klux.toFixed(0)} klux ile fotosentez için yeterli.`; }
  return { id: "light", emoji: "☀️", title: "Işık Seviyesi", body, severity, metric: "Işık", value: `${klux.toFixed(0)} klux` };
}

// ─── Recommendation generators ────────────────────────────────────────────────

function climateRec(sensor: SensorInput | null, weather: WeatherInput | null): RecommendationCard {
  const t   = sensor?.temperature ?? null;
  const h   = sensor?.humidity    ?? null;
  const ot  = weather?.outsideTemperature ?? null;
  const ws  = weather?.windSpeed          ?? null;
  let title: string, body: string;
  let severity: AISeverity = "ok";
  let confidence = 80;

  if (t !== null && t > 27) {
    severity = t > 30 ? "critical" : "warn";
    confidence = clamp(90 - (t - 27) * 2, 70, 96);
    title = "Sıcaklık Kontrolü Öncelikli";
    const outdoorNote = ot !== null && ot > 28
      ? ` Dış ortam da ${ot.toFixed(1)}°C — soğutma kapasitesi kısıtlı olabilir.`
      : "";
    body = `Sera sıcaklığı ${t.toFixed(1)}°C ile eşiği aştı. Havalandırma kapasitesini artırın, mümkünse gölgeleme malzemesi kullanın.${outdoorNote}`;
  } else if (ot !== null && ot > 30 && (t ?? 0) > 24) {
    severity = "warn";
    confidence = 82;
    title = "Dış Sıcaklık Etkisi — Havalandırma Öncelikli";
    body = `Dış ortam ${ot.toFixed(1)}°C ile yüksek. Sera sıcaklığı şu an ${t?.toFixed(1) ?? "—"}°C olsa da artış riski var. Havalandırmayı erken açın.`;
  } else if (ws !== null && ws > 40) {
    severity = "warn";
    confidence = 78;
    title = "Güçlü Rüzgar — Havalandırma Stratejisi";
    body = `Dış rüzgar ${ws.toFixed(0)} km/h. Havalandırma açıkken güçlü rüzgar sera sıcaklığını dalgalandırabilir. Kontrollü açma-kapama döngüsü önerin.`;
  } else if (h !== null && h > 75) {
    severity = "warn";
    confidence = 85;
    title = "Nem Yönetimi Gerekiyor";
    body = `Nem %${h.toFixed(0)} ile yüksek. Havalandırma artırılarak nem düşürülmeli. Sabah erken saatlerde havalandırma açılması önerilir.`;
  } else {
    severity = "ok";
    confidence = 88;
    title = "Sera İklimi Dengeli";
    const outdoorNote = ot !== null ? ` Dış ortam: ${ot.toFixed(1)}°C.` : "";
    body = `Sıcaklık ve nem değerleri normal aralıkta.${outdoorNote} Mevcut havalandırma ayarları korunabilir.`;
  }
  return { id: "climate", category: "climate", title, body, confidence, severity, relatedMetric: t != null ? `${t.toFixed(1)} °C` : "—" };
}

function irrigationRec(sensor: SensorInput | null, water: WaterInput | null, weather: WeatherInput | null): RecommendationCard {
  const sm   = sensor?.soilMoisture ?? null;
  const ec   = sensor?.ec           ?? null;
  const rain = weather?.rainChance  ?? null;
  let title: string, body: string;
  let severity: AISeverity = "ok";
  let confidence = 82;

  const rainNote = rain !== null && rain > 50
    ? ` Dış yağmur ihtimali %${rain.toFixed(0)} — sera nemini dolaylı etkileyebilir.`
    : "";

  if (sm !== null && sm < 55) {
    // Soften urgency when rain is likely (open-field context note)
    const soften = rain !== null && rain > 70;
    severity = sm < 40 ? (soften ? "warn" : "critical") : "warn";
    confidence = clamp(95 - sm, 75, 96);
    const waterNote = water ? ` Sulama suyu pH ${water.ph?.toFixed(1) ?? "?"} ve EC ${water.ec?.toFixed(1) ?? "?"} dS/m — uygun.` : "";
    title = sm < 40 ? "Acil Sulama Gerekiyor" : "Sulama Müdahalesi Önerilir";
    body = `Toprak nemi %${sm.toFixed(0)} ile düşük. Günde 2–3 sulama seansı, bitki başına 1.5–2 L uygulanmalı.${waterNote}${soften ? " Yağmur bekleniyor — doz %20 azaltılabilir." : ""}`;
  } else if (ec !== null && ec > 3.0) {
    severity = "warn";
    confidence = 84;
    title = "EC Düşürme Sulaması";
    body = `EC ${ec.toFixed(1)} dS/m yüksek. Saf su ile yıkama sulaması uygulanarak tuz birikimi azaltılmalı.${rainNote}`;
  } else {
    severity = "ok";
    confidence = 87;
    title = "Sulama Takvimi Yeterli";
    body = `Toprak nemi dengeli. Mevcut sulama programı sürdürülebilir. Sabah veya akşam serinliğinde sulama tercih edilmeli.${rainNote}`;
  }
  return { id: "irrigation", category: "irrigation", title, body, confidence, severity, relatedMetric: sm != null ? `%${sm.toFixed(0)}` : "—" };
}

function fertilizationRec(soil: SoilInput | null, crop: CropInput | null): RecommendationCard {
  const stage = crop?.growthStage ?? "VEGETATIVE";
  const sn = stageName(stage);
  let title: string, body: string;
  let severity: AISeverity = "info";
  let confidence = 76;

  if (!soil) {
    return { id: "fert", category: "fertilization", title: "Toprak Analizi Gerekli", body: "Gübreleme önerisi oluşturmak için güncel toprak analizi yapılmalıdır. Analiz girdikten sonra AI otomatik öneri üretecektir.", confidence: 60, severity: "info", relatedMetric: "—" };
  }

  const nHigh  = (soil.nitrogen   ?? 0)  > 80;
  const pLow   = (soil.phosphorus ?? 50) < 20;
  const kLow   = (soil.potassium  ?? 200) < 150;

  if (nHigh) {
    severity = "warn"; confidence = 82;
    title = "Azot Fazlası Tespit Edildi";
    body = `Azot ${soil.nitrogen?.toFixed(0)} ppm — fazla. ${sn} evresinde azotlu gübre dozunu %30 azaltın. K takviyesine odaklanın.`;
  } else if (pLow) {
    severity = "warn"; confidence = 84;
    title = "Fosfor Takviyesi Önerilir";
    body = `Fosfor ${soil.phosphorus?.toFixed(0)} ppm — düşük. Mono amonyum fosfat uygulayın. ${sn} evresinde kök gelişimi için kritik.`;
  } else if (kLow && (stage === "FLOWERING" || stage === "FRUITING")) {
    severity = "warn"; confidence = 88;
    title = "Potasyum Takviyesi Gerekli";
    body = `Potasyum ${soil.potassium?.toFixed(0)} ppm — düşük. ${sn} evresinde K en kritik besin. Potasyum sülfat dozunu artırın.`;
  } else {
    title = "Gübre Programı Normal Seyirde";
    body = `${sn} evresinde NPK değerleri dengeli (N:${soil.nitrogen?.toFixed(0)} · P:${soil.phosphorus?.toFixed(0)} · K:${soil.potassium?.toFixed(0)} ppm). Mevcut takvim sürdürülebilir.`;
    confidence = 85;
  }
  return { id: "fert", category: "fertilization", title, body, confidence, severity, relatedMetric: soil.nitrogen != null ? `N: ${soil.nitrogen.toFixed(0)} ppm` : "—" };
}

function riskRec(insights: InsightCard[], warningCount: number): RecommendationCard {
  const criticals = insights.filter(i => i.severity === "critical").length;
  const warns     = insights.filter(i => i.severity === "warn").length;
  const total     = criticals + warns;

  let title: string, body: string;
  let severity: AISeverity;
  const confidence = clamp(95 - total * 5 - warningCount * 2, 60, 95);

  if (criticals > 0) {
    severity = "critical";
    title = `${criticals} Kritik Risk Faktörü Aktif`;
    const list = insights.filter(i => i.severity === "critical").map(i => i.title).join(", ");
    body = `Kritik uyarılar: ${list}. Acil müdahale gerekebilir. AI sistemi tüm parametreleri maksimum hassasiyetle izliyor.`;
  } else if (warns > 0) {
    severity = "warn";
    title = `${warns} Aktif Uyarı Faktörü`;
    const list = insights.filter(i => i.severity === "warn").map(i => i.title).join(", ");
    body = `İzlenmesi gereken durumlar: ${list}. Önümüzdeki 24–48 saat takip önceliklidir.`;
  } else {
    severity = "ok";
    title = "Aktif Risk Faktörü Yok";
    body = "Tüm parametreler normal aralıkta. Sistem stabil izleme modunda. Rutin kontroller yeterli.";
  }
  return { id: "risk", category: "risk", title, body, confidence, severity, relatedMetric: `${total} uyarı` };
}

// ─── Mock answers ─────────────────────────────────────────────────────────────

function buildMockAnswers(
  input: EngineInput,
  insights: InsightCard[]
): MockQA[] {
  const s       = input.sensor;
  const crop    = input.crop;
  const soil    = input.soil;
  const water   = input.water;
  const weather = input.weather;

  const warns   = insights.filter(i => i.severity === "warn" || i.severity === "critical");
  const topWarn = warns[0];

  // Q1: Bugün neye dikkat etmeliyim?
  let q1ans: string;
  if (warns.length === 0) {
    q1ans = "Bugün tüm parametreler normal seyirde. Rutin kontroller yeterli — pH, nem ve sıcaklığı sabah ve akşam gözden geçirmenizi öneririm. Herhangi bir anormallik görürseniz hemen bildirim alacaksınız.";
  } else {
    const items = warns.slice(0, 3).map(w => `• ${w.title}: ${w.value}`).join("\n");
    q1ans = `Bugün ${warns.length} dikkat noktası var:\n${items}\n\nÖzellikle ${topWarn.title.toLowerCase()} öncelikli olarak izlenmeli. AI sistemi gerektiğinde otomatik müdahale yapıyor, ama manuel kontrol öneririm.`;
  }

  // Q2: Sulama gerekli mi?
  const sm   = s?.soilMoisture      ?? null;
  const irr  = s?.irrigationOn      ?? false;
  const rain = weather?.rainChance  ?? null;
  let q2ans: string;
  if (sm === null) {
    q2ans = "Toprak nemi sensör verisi mevcut değil. Manuel kontrol önerilir.";
  } else if (sm < 55) {
    const rainNote = rain !== null && rain > 70
      ? ` Dış yağmur ihtimali %${rain.toFixed(0)} — sulama dozunu %20 azaltabilirsiniz.`
      : "";
    q2ans = `Evet, sulama gerekli. Toprak nemi %${sm.toFixed(0)} ile önerilen %60–75 aralığının altında. ${irr ? "Sulama sistemi AI tarafından zaten aktif tutulmaktadır." : "Sulama sistemini hemen devreye alın."} ${water ? `Sulama suyu kalitesi uygun (pH: ${water.ph?.toFixed(1) ?? "?"}, EC: ${water.ec?.toFixed(1) ?? "?"} dS/m).` : ""}${rainNote}`;
  } else {
    q2ans = `Hayır, şu an sulama gerekmez. Toprak nemi %${sm.toFixed(0)} ile yeterli düzeyde (hedef: %60–75). ${irr ? "Sulama sistemi açık ama kısa süre içinde kapatılabilir." : "Sulama sistemi kapalı — doğru karar."}`;
  }

  // Q3: pH ve EC durumu nasıl?
  const ph  = s?.ph  ?? soil?.ph  ?? null;
  const ec  = s?.ec  ?? soil?.ec  ?? null;
  let q3ans: string;
  const phNote = ph  != null ? `pH ${ph.toFixed(1)} (ideal: 6.0–7.0 — ${ph >= 6.0 && ph <= 7.0 ? "✓ ideal" : "⚠ gözden geçir"})` : "pH verisi yok";
  const ecNote = ec  != null ? `EC ${ec.toFixed(1)} dS/m (ideal: 1.5–3.0 — ${ec >= 1.5 && ec <= 3.0 ? "✓ normal" : "⚠ dikkat"})` : "EC verisi yok";
  const wNote  = water ? `Sulama suyu: pH ${water.ph?.toFixed(1) ?? "?"} · EC ${water.ec?.toFixed(1) ?? "?"} dS/m.` : "";
  q3ans = `Toprak: ${phNote}\n${ecNote}\n${wNote}\n\n${ph != null && ph >= 6.0 && ph <= 7.0 && ec != null && ec >= 1.5 && ec <= 3.0 ? "Her iki değer de optimal aralıkta. Gübreleme yoğunluğu korunabilir." : "Değerleri yakından izlemeye devam edin."}`;

  // Q4: Hasat riskim var mı?
  const stage     = crop?.growthStage ?? null;
  const harvest   = crop?.expectedHarvest ?? null;
  const daysLeft  = daysUntil(harvest);
  const criticals = insights.filter(i => i.severity === "critical").length;
  const warnsN    = insights.filter(i => i.severity === "warn").length;
  let q4ans: string;
  const harvestStr = daysLeft != null ? ` Tahmini hasat ${daysLeft} gün sonra.` : "";
  if (!crop) {
    q4ans = "Ürün bilgisi girilmemiş. Hasat risk değerlendirmesi için ürün ve büyüme evresi tanımlanmalı.";
  } else if (criticals > 0) {
    q4ans = `Evet, hasat riski var. ${criticals} kritik parametre aktif. ${crop.name} (${stageName(stage!)}) bitkisinde ${criticals > 1 ? "bu stres faktörleri" : "bu stres faktörü"} ürün kayıplarına yol açabilir.${harvestStr} Hızlı müdahale tavsiye edilir.`;
  } else if (warnsN >= 2) {
    q4ans = `Düşük-orta hasat riski. ${warnsN} uyarı faktörü mevcut. ${crop.name} (${stageName(stage!)}) evresinde bu uyarılar kontrol altında tutulursa hasat riski minimumda kalır.${harvestStr}`;
  } else {
    q4ans = `Hasat riski düşük. ${crop.name} bitkisi ${stageName(stage!)} evresinde sağlıklı ilerliyor.${harvestStr} AI sistemi izlemeye devam ediyor.`;
  }

  // Q5: Dış hava koşulları serayı nasıl etkiliyor?
  let q5ans: string;
  if (!weather) {
    q5ans = "Dış hava durumu verisi mevcut değil. Sensör okumalarına göre sera içi parametreler takip ediliyor.";
  } else {
    const condLabels: Record<string, string> = { SUNNY: "güneşli", CLOUDY: "bulutlu", RAINY: "yağmurlu", WINDY: "rüzgarlı", STORMY: "fırtınalı" };
    const condTr = condLabels[weather.condition] ?? weather.condition.toLowerCase();
    const parts: string[] = [`Dış hava ${condTr} (${weather.outsideTemperature?.toFixed(1) ?? "—"}°C).`];
    if ((weather.rainChance ?? 0) > 60)  parts.push(`Yağmur ihtimali yüksek (%${weather.rainChance?.toFixed(0)}) — sulama dozunu düşürün.`);
    if ((weather.windSpeed  ?? 0) > 35)  parts.push(`Rüzgar güçlü (${weather.windSpeed?.toFixed(0)} km/h) — havalandırmayı kademeli açın, ani basınç değişiminden kaçının.`);
    if ((weather.solarRadiation ?? 999) < 200) parts.push(`Güneş radyasyonu düşük (${weather.solarRadiation?.toFixed(0)} W/m²) — yapay aydınlatmayı devreye almayı değerlendirin.`);
    if ((weather.outsideTemperature ?? 0) > 30) parts.push(`Yüksek dış sıcaklık sera soğutma kapasitesini sınırlar — havalandırmayı erkenden açın.`);
    if (parts.length === 1) parts.push("Şu an dış koşullar sera yönetimini olumsuz etkilemiyor.");
    q5ans = parts.join(" ");
  }

  return [
    { question: "Bugün neye dikkat etmeliyim?",               answer: q1ans },
    { question: "Sulama gerekli mi?",                          answer: q2ans },
    { question: "pH ve EC durumu nasıl?",                      answer: q3ans },
    { question: "Hasat riskim var mı?",                        answer: q4ans },
    { question: "Dış hava koşulları serayı nasıl etkiliyor?", answer: q5ans },
  ];
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateAssistantOutput(input: EngineInput): AssistantOutput {
  const s = input.sensor;

  const insights: InsightCard[] = [
    temperatureInsight(s?.temperature   ?? null),
    humidityInsight(s?.humidity         ?? null),
    phInsight(s?.ph ?? input.soil?.ph   ?? null, s?.ph != null ? "sensor" : "soil"),
    ecInsight(s?.ec                     ?? null),
    soilMoistureInsight(s?.soilMoisture ?? null),
    lightInsight(s?.lightLevel          ?? null),
  ];

  const recommendations: RecommendationCard[] = [
    climateRec(s, input.weather),
    irrigationRec(s, input.water, input.weather),
    fertilizationRec(input.soil, input.crop),
    riskRec(insights, input.warningCount),
  ];

  const mockAnswers = buildMockAnswers(input, insights);

  const topInsight =
    insights.find(i => i.severity === "critical") ??
    insights.find(i => i.severity === "warn") ??
    insights.find(i => i.severity === "ok") ??
    null;

  return { insights, recommendations, mockAnswers, topInsight };
}
