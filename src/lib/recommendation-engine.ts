export type GrowthStage = "SEEDLING" | "VEGETATIVE" | "FLOWERING" | "FRUITING" | "HARVEST";

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  SEEDLING:   "Fide / Çıkış",
  VEGETATIVE: "Vejetatif Büyüme",
  FLOWERING:  "Çiçeklenme",
  FRUITING:   "Meyve Bağlama",
  HARVEST:    "Hasat",
};

export interface SoilInput {
  ph: number;
  ec: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
}

export interface WaterInput {
  ph?: number | null;
  ec?: number | null;
}

export interface EngineInput {
  cropName: string;
  growthStage: GrowthStage;
  soil: SoilInput;
  water?: WaterInput | null;
}

export interface NutrientEntry {
  name: string;
  dose: string;
  frequency: string;
  product: string;
}

export interface RecommendationContent {
  summary: string;
  phTarget: string;
  ecTarget: string;
  nutrients: NutrientEntry[];
  irrigation: string;
  warnings: string[];
}

type CropCategory = "tomato" | "pepper" | "cucumber" | "leafy" | "generic";

function detectCrop(name: string): CropCategory {
  const n = name.toLowerCase();
  if (n.includes("domates") || n.includes("tomato")) return "tomato";
  if (n.includes("biber") || n.includes("pepper")) return "pepper";
  if (n.includes("salatalık") || n.includes("hıyar") || n.includes("cucumber")) return "cucumber";
  if (n.includes("marul") || n.includes("lettuce") || n.includes("ıspanak") || n.includes("spinach")) return "leafy";
  return "generic";
}

const PH_TARGETS: Record<CropCategory, { min: number; max: number }> = {
  tomato:   { min: 6.0, max: 6.8 },
  pepper:   { min: 6.0, max: 7.0 },
  cucumber: { min: 6.0, max: 7.0 },
  leafy:    { min: 6.0, max: 7.0 },
  generic:  { min: 6.0, max: 7.0 },
};

const EC_TARGETS: Record<CropCategory, Record<GrowthStage, { min: number; max: number }>> = {
  tomato: {
    SEEDLING:   { min: 0.8, max: 1.2 },
    VEGETATIVE: { min: 1.5, max: 2.5 },
    FLOWERING:  { min: 2.0, max: 3.0 },
    FRUITING:   { min: 2.5, max: 3.5 },
    HARVEST:    { min: 2.0, max: 3.0 },
  },
  pepper: {
    SEEDLING:   { min: 0.8, max: 1.2 },
    VEGETATIVE: { min: 1.5, max: 2.5 },
    FLOWERING:  { min: 2.0, max: 3.0 },
    FRUITING:   { min: 2.5, max: 3.5 },
    HARVEST:    { min: 2.0, max: 3.0 },
  },
  cucumber: {
    SEEDLING:   { min: 0.8, max: 1.2 },
    VEGETATIVE: { min: 1.5, max: 2.0 },
    FLOWERING:  { min: 1.8, max: 2.5 },
    FRUITING:   { min: 2.0, max: 3.0 },
    HARVEST:    { min: 1.8, max: 2.5 },
  },
  leafy: {
    SEEDLING:   { min: 0.5, max: 1.0 },
    VEGETATIVE: { min: 1.0, max: 1.5 },
    FLOWERING:  { min: 1.0, max: 1.5 },
    FRUITING:   { min: 0.8, max: 1.2 },
    HARVEST:    { min: 0.8, max: 1.2 },
  },
  generic: {
    SEEDLING:   { min: 0.8, max: 1.2 },
    VEGETATIVE: { min: 1.5, max: 2.5 },
    FLOWERING:  { min: 2.0, max: 3.0 },
    FRUITING:   { min: 2.0, max: 3.0 },
    HARVEST:    { min: 1.5, max: 2.5 },
  },
};

function getNutrients(
  category: CropCategory,
  stage: GrowthStage,
  soil: SoilInput
): NutrientEntry[] {
  const entries: NutrientEntry[] = [];
  const nLow  = soil.nitrogen   < 30;
  const nHigh = soil.nitrogen   > 80;
  const pLow  = soil.phosphorus < 20;
  const kLow  = soil.potassium  < 150;

  if (stage === "SEEDLING") {
    entries.push({ name: "Azot (N)",       dose: "2–3 kg/da",  frequency: "Haftada 1",   product: "Kalsiyum Nitrat (%15.5 N)" });
    entries.push({ name: "Fosfor (P₂O₅)",  dose: "3–4 kg/da",  frequency: "Haftada 1",   product: "Mono Amonyum Fosfat (%61 P₂O₅)" });
    entries.push({ name: "Potasyum (K₂O)", dose: "2–3 kg/da",  frequency: "Haftada 1",   product: "Potasyum Sülfat (%50 K₂O)" });
  } else if (stage === "VEGETATIVE") {
    const nDose = nLow ? "5–7 kg/da" : nHigh ? "1–2 kg/da" : "3–5 kg/da";
    entries.push({ name: "Azot (N)",       dose: nDose,         frequency: "Haftada 2",   product: "Amonyum Nitrat (%33 N)" });
    entries.push({ name: "Fosfor (P₂O₅)",  dose: pLow ? "4–5 kg/da" : "1–2 kg/da", frequency: "2 Haftada 1", product: "Mono Amonyum Fosfat (%61 P₂O₅)" });
    entries.push({ name: "Potasyum (K₂O)", dose: kLow ? "4–5 kg/da" : "3–4 kg/da", frequency: "Haftada 1",   product: "Potasyum Sülfat (%50 K₂O)" });
  } else if (stage === "FLOWERING") {
    entries.push({ name: "Azot (N)",       dose: "2–3 kg/da",  frequency: "Haftada 1",   product: "Potasyum Nitrat (%13 N)" });
    entries.push({ name: "Fosfor (P₂O₅)",  dose: "1–2 kg/da",  frequency: "2 Haftada 1", product: "Mono Amonyum Fosfat (%61 P₂O₅)" });
    entries.push({ name: "Potasyum (K₂O)", dose: kLow ? "7–9 kg/da" : "5–7 kg/da", frequency: "Haftada 2", product: "Potasyum Sülfat (%50 K₂O)" });
  } else if (stage === "FRUITING") {
    entries.push({ name: "Azot (N)",       dose: "1–2 kg/da",  frequency: "Haftada 1",   product: "Potasyum Nitrat (%13 N)" });
    entries.push({ name: "Potasyum (K₂O)", dose: kLow ? "8–10 kg/da" : "6–8 kg/da", frequency: "Haftada 2", product: "Potasyum Sülfat (%50 K₂O)" });
    entries.push({ name: "Kalsiyum (Ca)",  dose: "2–3 kg/da",  frequency: "Haftada 1",   product: "Kalsiyum Nitrat (%19 Ca)" });
  } else {
    entries.push({ name: "Azot (N)",       dose: "0–1 kg/da",  frequency: "Azaltılıyor", product: "—" });
    entries.push({ name: "Potasyum (K₂O)", dose: "3–4 kg/da",  frequency: "Haftada 1",   product: "Potasyum Sülfat (%50 K₂O)" });
  }

  return entries;
}

function getIrrigation(
  _category: CropCategory,
  stage: GrowthStage,
  water: WaterInput | null | undefined
): string {
  const ecWarning = water?.ec && water.ec > 2.0
    ? " Dikkat: sulama suyu EC değeri yüksek, seyreltme önerilir."
    : "";

  if (stage === "SEEDLING")   return `Günde 1–2 kez hafif sulama; toprak nem %60–70 tutulmalı.${ecWarning}`;
  if (stage === "VEGETATIVE") return `Damla sulama ile günde 2–3 kez; bitki başına 0.5–1 L/gün.${ecWarning}`;
  if (stage === "FLOWERING")  return `Düzenli sulama kritik; gün aşırı gübre çözeltisi uygulanabilir.${ecWarning}`;
  if (stage === "FRUITING")   return `Yüksek su talebi: günde 3–4 kez, 1.5–2 L/bitki/gün.${ecWarning}`;
  return `Sulamayı kademeli azalt; hasat öncesi son 3–5 gün sulama kesilmeli.${ecWarning}`;
}

function getWarnings(soil: SoilInput, water: WaterInput | null | undefined): string[] {
  const w: string[] = [];

  if      (soil.ph < 5.5) w.push("Toprak pH çok düşük (asidik). Kireçleme uygulanması önerilir.");
  else if (soil.ph > 7.5) w.push("Toprak pH yüksek (alkali). Elemental kükürt uygulaması değerlendirin.");

  if      (soil.ec > 3.5) w.push("Toprak EC kritik seviyede. Tuz stresi riski var; sulama ile yıkama yapın.");
  else if (soil.ec > 2.5) w.push("Toprak EC yüksek. Gübre dozlarını azaltın.");

  if (soil.nitrogen   > 80)  w.push("Azot fazlası tespit edildi. Azotlu gübre kullanımını kısıtlayın.");
  if (soil.phosphorus > 60)  w.push("Yüksek fosfor, demir ve çinko alımını engelleyebilir.");
  if (soil.organicMatter < 1.0) w.push("Organik madde oranı çok düşük. Kompost veya yanmış gübre ekleyin.");

  if (water?.ph != null) {
    if      (water.ph < 5.5) w.push("Sulama suyu pH düşük. Tampon solüsyon kullanın.");
    else if (water.ph > 8.0) w.push("Sulama suyu pH yüksek. Asit takviyesi (HNO₃ veya H₃PO₄) gerekebilir.");
  }
  if (water?.ec != null && water.ec > 2.5) {
    w.push("Sulama suyu EC çok yüksek. Seyreltme veya farklı su kaynağı kullanın.");
  }

  return w;
}

export function generateRecommendation(input: EngineInput): RecommendationContent {
  const category = detectCrop(input.cropName);
  const phT      = PH_TARGETS[category];
  const ecT      = EC_TARGETS[category][input.growthStage];

  const phStatus = input.soil.ph  < phT.min ? "düşük" : input.soil.ph  > phT.max ? "yüksek" : "uygun";
  const ecStatus = input.soil.ec  < ecT.min ? "düşük" : input.soil.ec  > ecT.max ? "yüksek" : "uygun";

  const nutrients  = getNutrients(category, input.growthStage, input.soil);
  const irrigation = getIrrigation(category, input.growthStage, input.water);
  const warnings   = getWarnings(input.soil, input.water);
  const stageName  = GROWTH_STAGE_LABELS[input.growthStage];

  const summary =
    `${input.cropName} bitkisi ${stageName} evresindedir. ` +
    `Toprak pH: ${input.soil.ph} (hedef: ${phT.min}–${phT.max}, durum: ${phStatus}), ` +
    `EC: ${input.soil.ec} dS/m (hedef: ${ecT.min}–${ecT.max}, durum: ${ecStatus}). ` +
    (warnings.length > 0
      ? `${warnings.length} önemli uyarı tespit edilmiştir.`
      : "Belirgin risk faktörü tespit edilmemiştir.");

  return {
    summary,
    phTarget:  `${phT.min} – ${phT.max}`,
    ecTarget:  `${ecT.min} – ${ecT.max} dS/m`,
    nutrients,
    irrigation,
    warnings,
  };
}

export function generateTitle(cropName: string, stage: GrowthStage): string {
  return `${cropName} – ${GROWTH_STAGE_LABELS[stage]} Gübre Önerisi`;
}
