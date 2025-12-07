import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada. Revisa tu archivo .env");

// LISTA DE SUPERVIVENCIA
// El sistema probará en este orden exacto.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",        // Intento 1: El estándar rápido actual
  "gemini-1.5-pro",          // Intento 2: El potente actual
  "gemini-pro",              // Intento 3: LA VIEJA CONFIABLE (Versión 1.0). Si todo falla, esta suele funcionar.
  "gemini-1.0-pro"           // Intento 4: Alias alternativo de la vieja confiable
];

// ==========================================
// 2. UTILIDADES
// ==========================================
const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
    clean = clean.substring(firstCurly, lastCurly + 1);
  }
  return clean.trim();
};

// MOTOR DE FUERZA BRUTA
async function generateWithFailover(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      // console.log(`🔄 Probando motor: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        console.log(`✅ Conectado exitosamente con: ${modelName}`);
        return text; // ¡Funcionó! Salimos de la función con el texto.
      }
    } catch (error: any) {
      console.warn(`⚠️ Falló ${modelName}. Saltando al siguiente...`);
      lastError = error;
      continue; // Si falla, pasamos al siguiente de la lista INMEDIATAMENTE
    }
  }

  // Si llegamos aquí, es que ni la versión vieja funcionó.
  throw lastError || new Error("Error crítico: Ningún modelo de IA respondió.");
}

// ==========================================
// 3. TIPOS
// ==========================================
export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suggestions: string[]; 
}

export interface ConversationLine {
  speaker: 'Médico' | 'Paciente';
  text: string;
}

export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; 
  soap?: SoapNote; 
  risk_analysis?: { level: 'Bajo' | 'Medio' | 'Alto', reason: string };
  patientInstructions?: string;
  actionItems?: any;
}

// ==========================================
// 4. MOTOR DE PERFILES CLÍNICOS
// ==========================================
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia.",
      bias: "Enfoque holístico."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías de ${specialty}.`,
    bias: `Criterios clínicos de ${specialty}.`
  };
};

// ==========================================
// 5. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: Actúas como "MediScribe AI" con conocimientos de ${profile.role}.
        OBJETIVO: Nota SOAP Técnica.
        
        REGLAS:
        1. NO DIAGNOSTICAS: Usa "Compatible con".
        2. RIESGOS: Si hay peligro vital, 'risk_analysis' = 'Alto'.
        
        ENFOQUE: ${profile.focus}
        FECHA: ${currentDate}
        HISTORIAL: "${patientHistory}"
        
        TRANSCRIPCIÓN:
        "${transcript.replace(/"/g, "'").trim()}"

        FORMATO JSON OBLIGATORIO (TEXTO PLANO):
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "...", "objective": "...", "assessment": "...", "plan": "...", "suggestions": [] 
          }, 
          "patientInstructions": "...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." } 
        }
      `;

      const rawText = await generateWithFailover(prompt);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- BALANCE 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n\n") : "Sin historial.";
      const prompt = `
          ACTÚA COMO: Auditor Médico. PACIENTE: "${patientName}".
          HISTORIAL: ${historySummary}. CONSULTAS: ${contextText}
          JSON SALIDA: { "evolution": "...", "medication_audit": "...", "risk_flags": [], "pending_actions": [] }
      `;
      const rawText = await generateWithFailover(prompt);
      return JSON.parse(cleanJSON(rawText)) as PatientInsight;
    } catch (e) {
      return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- EXTRAER MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    try {
      const prompt = `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${text.replace(/"/g, "'")}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "...", "duration": "...", "notes": "..."}]`;
      const rawText = await generateWithFailover(prompt);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- CHAT ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${context}. USUARIO: ${userMessage}. RESPUESTA:`;
       return await generateWithFailover(prompt);
    } catch (e) { return "Error de conexión."; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};