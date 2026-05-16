import type { CropType, FertilizerRecommendation, ApplicationSchedule } from "@/types";

interface SoilValues {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  calcium: number;
  magnesium: number;
  organicMatter: number;
  ecValue: number;
}

// Target NPK ranges per crop (kg/da)
const CROP_TARGETS: Record<CropType, { n: number; p: number; k: number; ca: number; mg: number }> = {
  TOMATO:   { n: 30, p: 12, k: 40, ca: 20, mg: 8 },
  PEPPER:   { n: 25, p: 10, k: 35, ca: 18, mg: 7 },
  CUCUMBER: { n: 28, p: 11, k: 38, ca: 16, mg: 6 },
};

// pH correction factor: acidic soil reduces nutrient availability
function phFactor(ph: number): number {
  if (ph < 5.5) return 1.3;
  if (ph < 6.0) return 1.15;
  if (ph <= 7.0) return 1.0;
  if (ph <= 7.5) return 1.1;
  return 1.25;
}

export function calculateRecommendation(
  crop: CropType,
  soil: SoilValues
): Omit<FertilizerRecommendation, "id" | "analysisId" | "generatedAt"> {
  const target = CROP_TARGETS[crop];
  const pf = phFactor(soil.ph);

  const nitrogenDose   = Math.max(0, Math.round((target.n - soil.nitrogen * 0.1)   * pf));
  const phosphorusDose = Math.max(0, Math.round((target.p - soil.phosphorus * 0.08) * pf));
  const potassiumDose  = Math.max(0, Math.round((target.k - soil.potassium * 0.12)  * pf));
  const calciumDose    = Math.max(0, Math.round((target.ca - soil.calcium * 0.05)  * pf));
  const magnesiumDose  = Math.max(0, Math.round((target.mg - soil.magnesium * 0.04) * pf));

  const schedule: ApplicationSchedule[] = [
    { week: 1,  label: "Dikim öncesi temel gübre",  nitrogen: Math.round(nitrogenDose * 0.3),   phosphorus: Math.round(phosphorusDose * 0.5), potassium: Math.round(potassiumDose * 0.25) },
    { week: 3,  label: "Vejetatif büyüme dönemi",   nitrogen: Math.round(nitrogenDose * 0.25),  phosphorus: Math.round(phosphorusDose * 0.2), potassium: Math.round(potassiumDose * 0.25) },
    { week: 6,  label: "Çiçeklenme başlangıcı",     nitrogen: Math.round(nitrogenDose * 0.25),  phosphorus: Math.round(phosphorusDose * 0.2), potassium: Math.round(potassiumDose * 0.25) },
    { week: 10, label: "Meyve bağlama dönemi",       nitrogen: Math.round(nitrogenDose * 0.2),   phosphorus: Math.round(phosphorusDose * 0.1), potassium: Math.round(potassiumDose * 0.25) },
  ];

  const notes = buildNotes(soil, crop);

  return { nitrogenDose, phosphorusDose, potassiumDose, calciumDose, magnesiumDose, applicationSchedule: schedule, notes };
}

function buildNotes(soil: SoilValues, crop: CropType): string {
  const warnings: string[] = [];

  if (soil.ph < 6.0) warnings.push("Toprak pH'ı düşük; kireçleme önerilir.");
  if (soil.ph > 7.5) warnings.push("Toprak pH'ı yüksek; kükürt uygulaması değerlendirilebilir.");
  if (soil.ecValue > 3.0) warnings.push("EC değeri yüksek; tuzluluk stresi riski var, sulama miktarını artırın.");
  if (soil.organicMatter < 2) warnings.push("Organik madde düşük; kompost/ahır gübresi takviyesi önerilir.");
  if (crop === "TOMATO" && soil.calcium < 10) warnings.push("Kalsiyum yetersiz; çiçek dip çürüklüğü riski yüksek.");

  return warnings.length > 0 ? warnings.join(" ") : "Toprak değerleri genel olarak uygun aralıkta.";
}
