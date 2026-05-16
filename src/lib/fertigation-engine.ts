import type { GrowthStage } from "./recommendation-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FertigationSoilInput {
  ph:            number | null;
  ec:            number | null;
  nitrogen:      number | null;
  phosphorus:    number | null;
  potassium:     number | null;
  organicMatter: number | null;
}

export interface FertigationInput {
  cropName:    string;
  growthStage: GrowthStage;
  soil:        FertigationSoilInput;
  water?:      { ph: number | null; ec: number | null } | null;
  sensor?:     { soilMoisture: number | null; temperature: number | null } | null;
  weather?:    { outsideTemperature: number | null; rainChance: number | null } | null;
  plantCount?: number | null;
}

export interface FertilizerLineItem {
  product:   string;
  dose:      string;
  frequency: string;
  reason:    string;
}

export interface FertigationOutput {
  targetPh:                 string;
  targetEc:                 string;
  irrigationLitersPerPlant: number;
  irrigationFrequency:      string;
  nitrogenAdvice:           string;
  phosphorusAdvice:         string;
  potassiumAdvice:          string;
  fertilizerPlan:           FertilizerLineItem[];
  riskSummary:              string;
  estimatedCost:            string;
  confidenceScore:          number;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

type CropCategory = "tomato" | "pepper" | "cucumber" | "leafy" | "generic";

function detectCrop(name: string): CropCategory {
  const n = name.toLowerCase();
  if (n.includes("domates") || n.includes("tomato"))   return "tomato";
  if (n.includes("biber")   || n.includes("pepper"))   return "pepper";
  if (n.includes("salatalık") || n.includes("hıyar") || n.includes("cucumber")) return "cucumber";
  if (n.includes("marul")   || n.includes("lettuce") || n.includes("ıspanak")) return "leafy";
  return "generic";
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

const PH_TARGETS: Record<CropCategory, [number, number]> = {
  tomato:   [6.0, 6.8],
  pepper:   [6.0, 7.0],
  cucumber: [6.0, 7.0],
  leafy:    [6.0, 7.0],
  generic:  [6.0, 7.0],
};

const EC_TARGETS: Record<CropCategory, Record<GrowthStage, [number, number]>> = {
  tomato:   { SEEDLING: [0.8, 1.2], VEGETATIVE: [1.5, 2.5], FLOWERING: [2.0, 3.0], FRUITING: [2.5, 3.5], HARVEST: [2.0, 3.0] },
  pepper:   { SEEDLING: [0.8, 1.2], VEGETATIVE: [1.5, 2.5], FLOWERING: [2.0, 3.0], FRUITING: [2.5, 3.5], HARVEST: [2.0, 3.0] },
  cucumber: { SEEDLING: [0.8, 1.2], VEGETATIVE: [1.5, 2.0], FLOWERING: [1.8, 2.5], FRUITING: [2.0, 3.0], HARVEST: [1.8, 2.5] },
  leafy:    { SEEDLING: [0.5, 1.0], VEGETATIVE: [1.0, 1.5], FLOWERING: [1.0, 1.5], FRUITING: [0.8, 1.2], HARVEST: [0.8, 1.2] },
  generic:  { SEEDLING: [0.8, 1.2], VEGETATIVE: [1.5, 2.5], FLOWERING: [2.0, 3.0], FRUITING: [2.0, 3.0], HARVEST: [1.5, 2.5] },
};

const BASE_LITERS: Record<GrowthStage, number> = {
  SEEDLING:   0.3,
  VEGETATIVE: 0.7,
  FLOWERING:  1.2,
  FRUITING:   2.0,
  HARVEST:    0.5,
};

const FREQ_NORMAL: Record<GrowthStage, string> = {
  SEEDLING:   "Günde 1–2 kez",
  VEGETATIVE: "Günde 2 kez",
  FLOWERING:  "Günde 2–3 kez",
  FRUITING:   "Günde 3–4 kez",
  HARVEST:    "Haftada 3–4 kez",
};

const FREQ_HIGH: Record<GrowthStage, string> = {
  SEEDLING:   "Günde 2–3 kez",
  VEGETATIVE: "Günde 3 kez",
  FLOWERING:  "Günde 3–4 kez",
  FRUITING:   "Günde 4–5 kez",
  HARVEST:    "Günde 1–2 kez",
};

// ─── Irrigation ───────────────────────────────────────────────────────────────

function computeIrrigation(input: FertigationInput): { liters: number; frequency: string } {
  let liters = BASE_LITERS[input.growthStage];

  const sm = input.sensor?.soilMoisture  ?? null;
  const ot = input.weather?.outsideTemperature ?? null;
  const rc = input.weather?.rainChance   ?? null;

  if (sm !== null && sm < 40) liters *= 1.6;
  else if (sm !== null && sm < 55) liters *= 1.3;

  if (ot !== null && ot > 35)      liters *= 1.4;
  else if (ot !== null && ot > 30) liters *= 1.2;

  if (rc !== null && rc > 70) liters *= 0.7;

  liters = Math.round(liters * 10) / 10;

  const needsHigh   = (sm !== null && sm < 55) || (ot !== null && ot > 30);
  const rainReduced = rc !== null && rc > 70;

  const frequency = rainReduced
    ? `Azaltılmış (yağmur riski %${rc!.toFixed(0)}) — ${FREQ_NORMAL[input.growthStage]}`
    : needsHigh
    ? FREQ_HIGH[input.growthStage]
    : FREQ_NORMAL[input.growthStage];

  return { liters, frequency };
}

// ─── NPK advice ───────────────────────────────────────────────────────────────

function nitrogenAdvice(soil: FertigationSoilInput, stage: GrowthStage): string {
  const n = soil.nitrogen;
  if (n === null) return "Azot verisi mevcut değil — toprak analizi yapılmalı.";
  if (n > 80) return `Azot yüksek (${n.toFixed(0)} ppm) — azotlu gübre kullanımını %50 kısıtlayın. Aşırı vejetatif büyüme riski.`;
  if (n < 30) return `Azot düşük (${n.toFixed(0)} ppm) — Kalsiyum Nitrat (%15.5N) ile acil takviye yapın. Haftada 2 uygulama.`;
  if (stage === "FRUITING" || stage === "HARVEST")
    return `Azot ${n.toFixed(0)} ppm — meyve/hasat döneminde azot minimumda tutulmalı (hedef: 20–40 ppm). K takviyesine öncelik verin.`;
  if (stage === "VEGETATIVE")
    return `Azot ${n.toFixed(0)} ppm — vejetatif büyüme için dengeli. Amonyum Nitrat (%33N) ile mevcut programı sürdürün.`;
  return `Azot ${n.toFixed(0)} ppm — dengeli seviyede, mevcut program yeterli.`;
}

function phosphorusAdvice(soil: FertigationSoilInput, stage: GrowthStage): string {
  const p = soil.phosphorus;
  if (p === null) return "Fosfor verisi mevcut değil.";
  if (p < 20) return `Fosfor kritik düşük (${p.toFixed(0)} ppm) — MAP (%61 P₂O₅) acil uygulayın. Kök ve çiçek gelişimi kısıtlanıyor.`;
  if (p > 60) return `Fosfor yüksek (${p.toFixed(0)} ppm) — fosforlu gübre kullanımını durdurun. Fe/Zn alımı bloke olabilir.`;
  if ((stage === "SEEDLING" || stage === "VEGETATIVE") && p < 35)
    return `Fosfor ${p.toFixed(0)} ppm — ${stage === "SEEDLING" ? "fide" : "büyüme"} döneminde takviye önerilebilir (hedef: 35–60 ppm).`;
  return `Fosfor ${p.toFixed(0)} ppm — yeterli seviyede.`;
}

function potassiumAdvice(soil: FertigationSoilInput, stage: GrowthStage): string {
  const k = soil.potassium;
  if (k === null) return "Potasyum verisi mevcut değil.";
  const isCritical = stage === "FLOWERING" || stage === "FRUITING";
  if (k < 150 && isCritical)
    return `Potasyum kritik düşük (${k.toFixed(0)} ppm) — ${stage === "FLOWERING" ? "çiçeklenme" : "meyve"} döneminde acil! Potasyum Sülfat (%50 K₂O) dozunu hemen artırın.`;
  if (k < 150)
    return `Potasyum düşük (${k.toFixed(0)} ppm) — Potasyum Sülfat (%50 K₂O) ile haftada 1 takviye yapın.`;
  if (k > 300)
    return `Potasyum yüksek (${k.toFixed(0)} ppm) — K dozunu %40 azaltın. Ca/Mg alımı kısıtlanabilir.`;
  if (isCritical && k < 220)
    return `Potasyum ${k.toFixed(0)} ppm — ${stage === "FLOWERING" ? "çiçeklenme" : "meyve"} döneminde K tüketimi yoğun. Haftada 2 kez Potasyum Sülfat uygulayın.`;
  return `Potasyum ${k.toFixed(0)} ppm — dengeli seviyede.`;
}

// ─── Fertilizer plan ──────────────────────────────────────────────────────────

function buildPlan(input: FertigationInput): FertilizerLineItem[] {
  const { soil, growthStage: stage } = input;
  const items: FertilizerLineItem[] = [];
  const n  = soil.nitrogen   ?? 50;
  const p  = soil.phosphorus ?? 40;
  const k  = soil.potassium  ?? 200;
  const ph = soil.ph         ?? 6.5;
  const ec = soil.ec         ?? 2.0;
  const isCritical = stage === "FLOWERING" || stage === "FRUITING";

  // pH correction
  if (ph > 7.3) items.push({ product: "Elemental Kükürt / Asit Gübre", dose: "20–30 kg/da", frequency: "3 Haftada 1", reason: `pH ${ph.toFixed(1)} — asitleme gerekiyor` });
  else if (ph < 5.8) items.push({ product: "Kireç (CaCO₃)", dose: "30–50 kg/da", frequency: "Mevsimlik", reason: `pH ${ph.toFixed(1)} — kireçleme gerekiyor` });

  // Nitrogen
  if (n < 30) {
    items.push({ product: "Kalsiyum Nitrat (%15.5N + %19Ca)", dose: "4–6 kg/da", frequency: "Haftada 2", reason: `Azot düşük (${n.toFixed(0)} ppm)` });
  } else if (n <= 80 && (stage === "SEEDLING" || stage === "VEGETATIVE")) {
    items.push({ product: "Amonyum Nitrat (%33N)", dose: n > 50 ? "2–3 kg/da" : "3–5 kg/da", frequency: "Haftada 2", reason: "Büyüme döneminde azot takviyesi" });
  } else if (n <= 80 && isCritical) {
    items.push({ product: "Potasyum Nitrat (%13N + %46K₂O)", dose: "2–3 kg/da", frequency: "Haftada 1", reason: "Çiçeklenme/meyve döneminde dengeli N+K" });
  }

  // Phosphorus
  if (p < 20) {
    items.push({ product: "Mono Amonyum Fosfat — MAP (%12N+%61P₂O₅)", dose: "4–6 kg/da", frequency: "2 Haftada 1", reason: `Fosfor kritik (${p.toFixed(0)} ppm)` });
  } else if (p < 35 && (stage === "SEEDLING" || stage === "VEGETATIVE")) {
    items.push({ product: "Mono Amonyum Fosfat — MAP (%12N+%61P₂O₅)", dose: "2–3 kg/da", frequency: "2 Haftada 1", reason: "Büyüme dönemi fosfor desteği" });
  }

  // Potassium
  if (k < 150 && isCritical) {
    items.push({ product: "Potasyum Sülfat (%50K₂O)", dose: "7–9 kg/da", frequency: "Haftada 2", reason: `Kritik dönemde K düşük (${k.toFixed(0)} ppm)` });
  } else if (k < 150) {
    items.push({ product: "Potasyum Sülfat (%50K₂O)", dose: "4–5 kg/da", frequency: "Haftada 1", reason: `Potasyum düşük (${k.toFixed(0)} ppm)` });
  } else if (isCritical) {
    items.push({ product: "Potasyum Sülfat (%50K₂O)", dose: "5–7 kg/da", frequency: "Haftada 2", reason: "Çiçeklenme/meyve döneminde yoğun K" });
  } else {
    items.push({ product: "Potasyum Sülfat (%50K₂O)", dose: "3–4 kg/da", frequency: "Haftada 1", reason: "Rutin K desteği" });
  }

  // EC leaching
  if (ec > 3.0) items.push({ product: "Yıkama Sulaması (temiz su)", dose: "2× normal doz", frequency: "Haftada 1", reason: `EC yüksek (${ec.toFixed(1)} dS/m) — tuz yıkama` });

  // Calcium for fruiting
  if (stage === "FRUITING") {
    items.push({ product: "Kalsiyum Nitrat (%19Ca+%15.5N)", dose: "2–3 kg/da", frequency: "Haftada 1", reason: "Meyve dönemi Ca — çiçek sonu çürüklüğü önleme" });
  }

  return items;
}

// ─── Risk summary ─────────────────────────────────────────────────────────────

function buildRiskSummary(input: FertigationInput, cat: CropCategory): string {
  const risks: string[] = [];
  const { soil, weather, sensor, growthStage } = input;
  const [phMin, phMax] = PH_TARGETS[cat];
  const [, ecMax]      = EC_TARGETS[cat][growthStage];

  if (soil.ph !== null) {
    if (soil.ph < phMin - 0.3)  risks.push(`pH ${soil.ph.toFixed(1)} düşük (hedef ≥${phMin})`);
    else if (soil.ph > phMax + 0.3) risks.push(`pH ${soil.ph.toFixed(1)} yüksek (hedef ≤${phMax})`);
  }
  if (soil.ec !== null && soil.ec > ecMax + 0.5) risks.push(`EC ${soil.ec.toFixed(1)} dS/m kritik yüksek — tuz stresi`);
  if ((soil.nitrogen   ?? 0)  > 80)  risks.push("Azot fazlası — vejetatif aşırı büyüme");
  if ((soil.phosphorus ?? 50) < 20)  risks.push("Fosfor kritik — kök/çiçek gelişimi kısıtlanıyor");
  if ((soil.potassium  ?? 200) < 150 && (growthStage === "FLOWERING" || growthStage === "FRUITING")) risks.push("K kritik dönemde düşük — verim kaybı riski");
  if ((soil.organicMatter ?? 2) < 1.0) risks.push("Organik madde çok düşük — toprak yapısı bozulabilir");
  if ((sensor?.soilMoisture ?? 100) < 50) risks.push("Toprak nemi kritik — sulama öncelikli");
  if ((weather?.outsideTemperature ?? 0) > 32) risks.push("Yüksek dış sıcaklık — soğutma kapasitesi baskı altında");
  if ((weather?.rainChance ?? 0) > 70) risks.push("Yağmur riski — sulama dozu azaltılmalı");

  if (risks.length === 0) return "Belirlenen risk faktörü yok. Tüm parametreler kabul edilebilir aralıkta — rutin takip yeterli.";
  return `${risks.length} risk faktörü tespit edildi: ${risks.join(" · ")}.`;
}

// ─── Cost estimate ────────────────────────────────────────────────────────────

function estimateCost(items: FertilizerLineItem[], plantCount: number | null | undefined): string {
  const base      = items.length * 80;
  const mult      = clamp((plantCount ?? 200) / 200, 0.5, 3);
  const low       = Math.round(base * mult * 0.8  / 10) * 10;
  const high      = Math.round(base * mult * 1.3  / 10) * 10;
  return `₺${low}–${high} / ay`;
}

// ─── Confidence score ─────────────────────────────────────────────────────────

function computeConfidence(input: FertigationInput): number {
  let score = 88;
  if (!input.sensor)  score -= 10;
  if (!input.weather) score -= 8;
  if (!input.water)   score -= 5;
  const allSoilPresent = input.soil.ph !== null && input.soil.nitrogen !== null && input.soil.phosphorus !== null;
  if (allSoilPresent) score += 5;
  return clamp(score, 60, 95);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function runFertigation(input: FertigationInput): FertigationOutput {
  const cat            = detectCrop(input.cropName);
  const [phMin, phMax] = PH_TARGETS[cat];
  const [ecMin, ecMax] = EC_TARGETS[cat][input.growthStage];

  const { liters, frequency } = computeIrrigation(input);
  const plan = buildPlan(input);

  return {
    targetPh:                 `${phMin} – ${phMax}`,
    targetEc:                 `${ecMin} – ${ecMax} dS/m`,
    irrigationLitersPerPlant: liters,
    irrigationFrequency:      frequency,
    nitrogenAdvice:           nitrogenAdvice(input.soil, input.growthStage),
    phosphorusAdvice:         phosphorusAdvice(input.soil, input.growthStage),
    potassiumAdvice:          potassiumAdvice(input.soil, input.growthStage),
    fertilizerPlan:           plan,
    riskSummary:              buildRiskSummary(input, cat),
    estimatedCost:            estimateCost(plan, input.plantCount),
    confidenceScore:          computeConfidence(input),
  };
}
