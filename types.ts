
export enum PatientGroup {
  HD = 'Hemodialysis (HD)',
  PD = 'Peritoneal Dialysis (PD)',
  ND_CKD = 'Non-Dialysis CKD',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export enum Stage {
  Screening = 1,
  IronTherapy = 2,
  FullWorkup = 3,
  ESAManagement = 4,
}

export interface PatientState {
  // Stage 1
  group: PatientGroup | null;
  gender: Gender | null;
  hb: number | '';
  
  // Stage 2
  ferritin: number | '';
  tsat: number | '';
  serumIron: number | ''; // Calculator input
  tibc: number | '';      // Calculator input
  hasActiveInfection: boolean;
  
  // Stage 3 - Detailed Workup Checklist
  workupAllNegative: boolean;
  workupSmear: boolean;
  workupHemolysis: boolean;
  workupInflammation: boolean;
  workupB12Folate: boolean;
  workupLiver: boolean;
  workupThyroid: boolean;
  workupParathyroid: boolean;
  workupMyeloma: boolean;
  workupParasites: boolean;

  // Stage 4 - Tier 1 (Clinical History / Contraindications)
  currentStrokeOrThrombosis: boolean;
  isPregnant: boolean;
  activeMalignancy: boolean;
  historyOfCancer: boolean; // Not in complete remission for 2-5 yr
  polycysticKidneyDisease: boolean;
  proliferativeRetinalDisease: boolean;
  pulmonaryArterialHypertension: boolean;
  hepaticImpairment: boolean;
  priorCVEvents: boolean; // Stroke or MI
  priorThromboembolicEvents: boolean; // DVT, vascular access thrombosis, PE

  // Stage 4 - Tier 2 (Clinical Status)
  esaIntolerance: boolean; // Allergy, HTN
  esaHyporesponsive: boolean;
  highCRP: boolean; // > 0.3 mg/dl

  // Stage 4 - Tier 3 (Preferences / Logistics)
  accessToRefrigeration: boolean;
  preference: 'Oral' | 'Injection' | null;
}

export interface DecisionResult {
  status: 'continue' | 'stop' | 'action_required';
  title: string;
  message: string;
  details?: string[];
  recommendationType?: 'urgent' | 'treatment' | 'info';
}
