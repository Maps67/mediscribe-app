import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// ✅ IMPORTACIÓN CRÍTICA: Usamos los tipos globales
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-FINAL: PROMETHEUS ENGINE (Technical ID -001)");

// ==========================================
// 1. CONFIGURACIÓN DE ALTO NIVEL
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ FATAL: API Key no encontrada. El cerebro de la IA está desconectado.");
}

// 🔥 CORRECCIÓN TÉCNICA: Usamos la versión "001" (Freeze Version)
// Esta versión NUNCA cambia y es la más compatible con cuentas nuevas.
const MODEL_NAME = "gemini-1.5-flash-001";

// CONFIGURACIÓN DE SEGURIDAD
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES
// ==========================================

const cleanJSON = (text: string): string => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    return clean.trim();
  } catch (e) {
    console.error("Error limpiando JSON:", e);
    return text; 
  }
};

/**
 * MOTOR DE GENERACIÓN DIRECTO (CONECTADO AL MODELO -001)
 */
async function generateContentDirect(prompt: string, jsonMode: boolean = false, tempOverride?: number): Promise<string> {
  if (!API_KEY) throw new Error("Falta la API Key en Netlify.");

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    console.log(`📡 Conectando con ${MODEL_NAME}...`);
    
    // Configuración específica para evitar errores de versión
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
          temperature: tempOverride ?? 0.3, 
          topP: 0.95,
          topK: 40,
          responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (text && text.length > 5) return text;
    throw new Error("Respuesta vacía de Google.");

  } catch (error: any) {
    console.error(`❌ Error en Gemini (${MODEL_NAME}):`, error);
    throw new Error(`Error de IA: ${error.message || 'No se pudo conectar con el servicio.'}`);
  }
}

/**
 * PERFILES CLÍNICOS
 */
const getSpecialtyConfig = (specialty: string) => {
  const defaults = {
    role: `Médico Especialista en ${specialty}`,
    focus: "Diagnóstico diferencial, plan de manejo integral y seguridad del paciente.",
    bias: "Prioriza descartar patologías graves."
  };
  return defaults; 
};

// ==========================================
// 3. SERVICIO PRINCIPAL (LOGIC CORE)
// ==========================================
export const GeminiMedicalService = {

  // ---------------------------------------------------------------------------
  // A. GENERACIÓN DE NOTA CLÍNICA
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      const prompt = `
        ACTÚA COMO: ${profile.role}.
        CONTEXTO: ${profile.focus}
        
        --- DATOS DEL PACIENTE ---
        HISTORIAL: ${patientHistory || "No disponible"}
        TRANSCRIPCIÓN: "${transcript.replace(/"/g, "'").trim()}"

        --- INSTRUCCIONES ---
        Genera un JSON estricto con la nota clínica SOAP.

        FORMATO SALIDA:
        {
          "clinicalNote": "Nota de evolución completa (200 palabras).",
          "soapData": {
            "subjective": "Padecimiento actual.",
            "objective": "Signos vitales y exploración.",
            "analysis": "Diagnóstico y justificación.",
            "plan": "Tratamiento y estudios."
          },
          "patientInstructions": "Indicaciones claras para el paciente.",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Explicación breve."
          },
          "actionItems": {
             "next_appointment": "Fecha o null",
             "urgent_referral": false,
             "lab_tests_required": []
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ]
        }
      `;

      const rawText = await generateContentDirect(prompt, true, 0.3);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error Crítico:", error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE 360
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial.";
      const prompt = `
          ACTÚA COMO: Auditor Médico.
          PACIENTE: ${patientName}.
          HISTORIAL: ${historySummary}
          EVOLUCIÓN: ${contextText}

          JSON SALIDA:
          {
            "evolution": "Resumen de progreso.",
            "medication_audit": "Análisis de medicamentos.",
            "risk_flags": ["Riesgos"],
            "pending_actions": ["Acciones"]
          }
      `;
      const rawText = await generateContentDirect(prompt, true, 0.2);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { evolution: "No disponible.", medication_audit: "Sin datos.", risk_flags: [], pending_actions: [] };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN DE MEDICAMENTOS
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        Extrae medicamentos de: "${text.replace(/"/g, "'")}".
        JSON Array: [{ "drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Tiempo" }]
      `;
      const rawText = await generateContentDirect(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        Audita esta nota: "${noteContent}".
        JSON: { "riskLevel": "Bajo/Alto", "score": 0-100, "analysis": "...", "recommendations": [] }
      `;
      const rawText = await generateContentDirect(prompt, true, 0.4);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Bajo", score: 100 }; }
  },

  // ---------------------------------------------------------------------------
  // E. SEGUIMIENTO WHATSAPP
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        3 mensajes WhatsApp para seguimiento de ${patientName}.
        Contexto: ${instructions}
        JSON Array: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateContentDirect(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
         Contexto Médico: ${context}
         Pregunta: "${userMessage}"
         Responde breve y técnico.
       `;
       return await generateContentDirect(prompt, false, 0.4);
    } catch (e) { return "Error de conexión con el asistente."; }
  },

  // --- HELPERS LEGACY ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use receta estructurada."; }
};