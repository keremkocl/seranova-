export type Role = "FARMER" | "CONSULTANT" | "ADMIN";

export type CropType = "TOMATO" | "PEPPER" | "CUCUMBER";

export const CROP_LABELS: Record<CropType, string> = {
  TOMATO: "Domates",
  PEPPER: "Biber",
  CUCUMBER: "Salatalık",
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  area: number;
  userId: string;
  createdAt: Date;
}

export interface SoilAnalysis {
  id: string;
  farmId: string;
  farm?: Farm;
  crop: CropType;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  calcium: number;
  magnesium: number;
  sulfur: number;
  organicMatter: number;
  ecValue: number;
  analysisDate: Date;
  createdAt: Date;
  recommendation?: FertilizerRecommendation;
}

export interface FertilizerRecommendation {
  id: string;
  analysisId: string;
  nitrogenDose: number;
  phosphorusDose: number;
  potassiumDose: number;
  calciumDose: number;
  magnesiumDose: number;
  applicationSchedule: ApplicationSchedule[];
  notes: string;
  generatedAt: Date;
}

export interface ApplicationSchedule {
  week: number;
  label: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}
