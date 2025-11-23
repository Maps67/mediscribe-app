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
  DIGITAL_CARD,
  CALENDAR // Nueva vista agregada
}

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

export interface DoctorProfile {
  id?: string;
  full_name: string;
  specialty: string;
  license_number: string;
  phone: string;
  university: string;
  address: string;
  logo_url: string;
  signature_url: string;
  website_url?: string;
  subscription_tier: 'basic' | 'pro' | 'enterprise';
}

export interface PatientAttachment {
  id: string;
  created_at: string;
  patient_id: string;
  name: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
  doctor_id: string;
}

// --- NUEVO: INTERFAZ DE CITAS ---
export interface Appointment {
  id: string;
  created_at: string;
  doctor_id: string;
  patient_id: string;
  patient?: { name: string }; // Join para mostrar nombre en calendario
  title: string;
  start_time: string; // Supabase devuelve ISO Strings
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}
