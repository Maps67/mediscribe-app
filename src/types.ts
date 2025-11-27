// --- PERFILES DE USUARIO ---
export interface DoctorProfile {
  id: string;
  full_name: string | null;
  specialty: string | null;
  license_number: string | null;
  phone: string | null;
  university: string | null;
  address: string | null;
  logo_url: string | null;
  signature_url: string | null;
  website_url?: string | null;
  updated_at: string | null;
}

// --- PACIENTES ---
export interface Patient {
  id: string;
  created_at: string;
  name: string;
  doctor_id: string;
  // Campos extendidos V3.1
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  history?: string;
}

// --- CONSULTAS E HISTORIAL ---
export interface Consultation {
  id: string;
  created_at: string;
  doctor_id: string;
  patient_id: string;
  transcript: string;
  summary: string; // Aquí se guarda el texto o el JSON stringified
  status: 'pending' | 'completed' | 'archived';
}

// --- MEDICAMENTOS (RECETA) ---
export interface MedicationItem {
  id?: string; // Opcional para manejo en frontend
  drug: string;
  details: string;
  frequency: string;
  duration: string;
  notes: string;
}

// --- ESTRUCTURA SOAP (NUEVO MOTOR V4) ---
export interface SOAPHeaders {
    date: string;
    time: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
}

export interface SOAPData {
    headers: SOAPHeaders;
    subjective: string;
    objective: string;
    analysis: string;
    plan: string;
}

// --- RESPUESTA DE LA IA (GEMINI) ---
export interface GeminiResponse {
  // Campo legado para compatibilidad
  clinicalNote: string; 
  
  // NUEVO: Datos estructurados para visualización profesional
  soapData?: SOAPData; 
  
  patientInstructions: string;
  
  actionItems?: {
    next_appointment?: string | null;
    urgent_referral?: boolean;
    lab_tests_required?: string[];
  };
}

// --- CHAT ASISTENTE ---
export interface FollowUpMessage {
  role: 'user' | 'model';
  text: string;
}
