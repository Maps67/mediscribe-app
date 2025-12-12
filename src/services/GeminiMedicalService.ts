import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Importamos interfaces locales
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: MODO UNIVERSAL (Compatibility Mode)");

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada.");

// ⚠️ SOLUCIÓN AL ERROR 404: USAR ALIAS GENÉRICO
// No usamos "gemini-1.5-flash" ni "gemini-1.0-pro".
// Usamos "gemini-pro". Este alias Google lo redirige automáticamente al modelo activo disponible para tu cuenta.
const MODELS_TO_TRY = ["gemini-pro"];

// SAFETY SETTINGS (Anti-Bloqueo Médico)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
];

// ==========================================
// 2. UTILIDADES
// ==========================================

const cleanJSON = (text: string) => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    }
    return clean.trim();
  } catch (e) { return text; }
};

/**
 * MOTOR DE CONEXIÓN SIMPLE
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // Usamos el único modelo universal
  const modelName = MODELS_TO_TRY[0];

  try {
    console.log(`📡 Conectando Modelo Universal: ${modelName}...`);
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
    });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (text && text.length > 5) return text;
    throw new Error("Respuesta vacía del servidor.");

  } catch (error: any) {
    console.error("❌ ERROR DEFINITIVO:", error);
    // Si esto falla con 404, es 100% la API Key.
    throw new Error(`Error de IA (${error.status || 'Desconocido'}). Si es 404, tu API Key no tiene permisos para Generative Language.`);
  }
}

/**
 * PERFILES CLÍNICOS (V-ULTIMATE Logic)
 */
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
      focus: "Morfología de lesiones cutáneas, anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos y vacunación.",
      bias: "Evalúa todo en contexto de la edad."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, embarazo, vitalidad fetal.",
      bias: "Enfoque en bienestar materno-fetal."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral y referencia oportuna.",
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
// 3. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA (V-ULTIMATE LOGIC) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: Actúas como "MediScribe AI".
        PERFIL: ${profile.role}. ENFOQUE: ${profile.focus}. SESGO: ${profile.bias}

        🔥🔥 TAREA: DIARIZACIÓN Y DOCUMENTACIÓN 🔥🔥
        1. Identifica Médico vs Paciente.
           - Saludo inicial = Médico.
           - Reporte de síntomas = Paciente.

        🔥🔥 ESTRATEGIA: HYBRID RETRIEVAL 🔥🔥
        FUENTE A (Historial): "${patientHistory || "VACÍO"}"
        FUENTE B (Audio): "${transcript.replace(/"/g, "'").trim()}"

        🚨 REGLA ANAMNESIS ACTIVA:
        Si el paciente menciona medicamentos/alergias en el AUDIO (Fuente B), agrégalos a 'subjective' aunque no estén en el historial.

        🛑 EVALUACIÓN DE RIESGO:
        - URGENCIA VITAL (Infarto, Apendicitis) -> RIESGO ALTO.
        - INTERACCIÓN FARMACOLÓGICA GRAVE -> RIESGO ALTO.

        ---------- SAFETY OVERRIDE ----------
        Si hay riesgo ALTO o interacción:
        - NO escribas la instrucción del medicamento peligroso en 'patientInstructions'.
        - SUSTITUYE por aviso de seguridad.
        -------------------------------------

        DATOS: Fecha ${now.toLocaleDateString()}.

        GENERA JSON (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica...",
          "soapData": {
            "subjective": "S (incluye anamnesis verbal)...",
            "objective": "O...",
            "analysis": "A...",
            "plan": "P...",
            "suggestions": ["..."]
          },
          "patientInstructions": "Instrucciones seguras...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "..."
          },
          "actionItems": {
             "urgent_referral": boolean,
             "lab_tests_required": ["..."]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ]
        }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- B. BALANCE 360 ---
  async generatePatient360Analysis(p: string, h: string, c: string[]): Promise<PatientInsight> {
    try {
      const ctx = c.length > 0 ? c.join("\n\n") : "Sin historial.";
      const prompt = `ACTÚA COMO: Auditor Médico. PACIENTE: ${p}. HISTORIAL: ${h}. CONSULTAS: ${ctx}. SALIDA JSON (PatientInsight): { "evolution": "...", "medication_audit": "...", "risk_flags": [], "pending_actions": [] }`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { evolution: "N/A", medication_audit: "", risk_flags: [], pending_actions: [] }; }
  },

  // --- C. EXTRACCIÓN MEDS ---
  async extractMedications(t: string): Promise<MedicationItem[]> {
    if (!t) return [];
    try {
      const prompt = `ACTÚA COMO: Farmacéutico. Extrae meds de: "${t}". SALIDA JSON ARRAY (MedicationItem[]).`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA ---
  async generateClinicalNoteAudit(n: string): Promise<any> {
    try {
      const prompt = `ACTÚA COMO: Auditor. Evalúa nota: "${n}". SALIDA JSON { riskLevel, score, analysis, recommendations }.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "N/A", recommendations: [] }; }
  },

  // --- E. WHATSAPP ---
  async generateFollowUpPlan(p: string, n: string, i: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `ACTÚA COMO: Asistente. 3 mensajes WhatsApp para ${p}. Nota: "${n}". JSON ARRAY.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // --- F. CHAT ---
  async chatWithContext(c: string, u: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${c}. PREGUNTA: ${u}. RESPUESTA:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Error conexión."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};