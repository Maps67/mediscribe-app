export interface Patient {
  id: string;
  created_at: string;
  doctor_id: string;
  name: string;
  phone?: string | null;
  condition?: string | null;
  avatar_url?: string | null;
}

export interface Consultation {
  id: string;
  created_at: string;
  doctor_id: string;
  patient_id: string;
  transcript: string;
  summary: string | null;
  status: 'completed' | 'pending' | 'in_progress';
}

export interface MedicalRecord extends Consultation {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export enum ViewState {
  DASHBOARD,
  CONSULTATION,
  PATIENTS,
  DIGITAL_CARD
}

// NUEVO: Estructura para los Items de Acción
export interface ActionItems {
  next_appointment: string | null;
  urgent_referral: boolean;
  lab_tests_required: string[];
}

export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: ActionItems;
}
