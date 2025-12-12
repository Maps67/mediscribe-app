import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// ✅ IMPORTACIÓN CRÍTICA: Asegúrate de que estos tipos existan en tu archivo src/types/index.ts
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-FINAL: PROMETHEUS ENGINE (Full Suite - Gemini 2.5 Flash)");

// ==========================================
// 1. CONFIGURACIÓN DE ALTO NIVEL
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ FATAL: API Key no encontrada en variables de entorno.");
}

// 🔥 EL CAMBIO DEFINITIVO: Usamos el modelo que apareció en tu lista oficial
const MODEL_NAME = "gemini-2.5-flash";

// CONFIGURACIÓN DE SEGURIDAD (GUARDRAILS)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES DE LIMPIEZA & PROCESAMIENTO
// ==========================================

const cleanJSON = (text: string): string => {
  try {
    // Limpieza agresiva de bloques de código Markdown
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    
    // Búsqueda quirúrgica del objeto o array JSON
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
 * MOTOR DE GENERACIÓN DIRECTO
 * Conecta específicamente al modelo 2.5 sin bucles de reintento para evitar errores 404.
 */
async function generateContentDirect(prompt: string, jsonMode: boolean = false, tempOverride?: number): Promise<string> {
  if (!API_KEY) throw new Error("Falta la API Key en Netlify.");

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    console.log(`📡 Conectando al núcleo: ${MODEL_NAME}...`);
    
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
    throw new Error("Google devolvió una respuesta vacía.");

  } catch (error: any) {
    console.error(`❌ Error en Motor IA (${MODEL_NAME}):`, error);
    // Mensaje claro para depuración
    throw new Error(`Fallo de IA (${MODEL_NAME}): ${error.message || 'Error de conexión'}`);
  }
}

/**
 * PERFILES CLÍNICOS DINÁMICOS
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
  // A. GENERACIÓN DE NOTA CLÍNICA (CORE)
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      const prompt = `
        ACTÚA COMO: ${profile.role}.
        CONTEXTO: ${profile.focus}
        SESGO: ${profile.bias}

        --- DATOS DEL PACIENTE ---
        HISTORIAL: ${patientHistory || "No disponible"}
        TRANSCRIPCIÓN: "${transcript.replace(/"/g, "'").trim()}"

        --- TAREA ---
        Genera un JSON estricto con la nota clínica SOAP completa.

        FORMATO JSON REQUERIDO:
        {
          "clinicalNote": "Nota narrativa completa (aprox 200 palabras).",
          "soapData": {
            "subjective": "Padecimiento actual y antecedentes.",
            "objective": "Signos vitales y exploración física.",
            "analysis": "Diagnóstico y justificación médica.",
            "plan": "Tratamiento farmacológico y estudios."
          },
          "patientInstructions": "Indicaciones para el paciente (lenguaje claro).",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación del riesgo."
          },
          "actionItems": {
             "next_appointment": "Fecha sugerida o null",
             "urgent_referral": false, // true/false
             "lab_tests_required": ["Lista de estudios"]
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
      console.error("❌ Error generando Nota Clínica:", error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE 360 (AVANZADO)
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial reciente.";
      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          PACIENTE: ${patientName}.
          HISTORIAL: ${historySummary}
          EVOLUCIÓN RECIENTE: ${contextText}

          Analiza tendencias y genera este JSON:
          {
            "evolution": "Resumen de progreso del paciente.",
            "medication_audit": "Análisis de interacciones o adherencia.",
            "risk_flags": ["Riesgo 1", "Riesgo 2"],
            "pending_actions": ["Acción pendiente 1", "Acción pendiente 2"]
          }
      `;
      const rawText = await generateContentDirect(prompt, true, 0.2);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      console.warn("Fallo parcial en Análisis 360", e);
      return { evolution: "No disponible.", medication_audit: "Sin datos.", risk_flags: [], pending_actions: [] };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN DE MEDICAMENTOS (FARMACIA)
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text || text.length < 10) return [];
    try {
      const prompt = `
        Analiza el texto y extrae medicamentos recetados.
        TEXTO: "${text.replace(/"/g, "'")}"
        
        Responde SOLO con un Array JSON:
        [{ "drug": "Nombre genérico/comercial", "details": "Dosis", "frequency": "Cada X horas", "duration": "Por X días" }]
      `;
      const rawText = await generateContentDirect(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD (QA)
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        Audita la calidad y completitud de esta nota clínica:
        "${noteContent}"
        
        JSON: { "riskLevel": "Bajo/Alto", "score": 0-100, "analysis": "Crítica constructiva", "recommendations": [] }
      `;
      const rawText = await generateContentDirect(prompt, true, 0.4);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Bajo", score: 100, analysis: "No auditado", recommendations: [] }; }
  },

  // ---------------------------------------------------------------------------
  // E. SEGUIMIENTO WHATSAPP
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        Redacta 3 mensajes de WhatsApp cortos y empáticos para el seguimiento de ${patientName}.
        Basado en estas instrucciones: ${instructions}
        
        JSON Array: [{ "day": 1, "message": "Hola..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateContentDirect(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL (ASISTENTE)
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
         ERES: Asistente médico experto.
         CONTEXTO ACTUAL: ${context}
         PREGUNTA DEL DOCTOR: "${userMessage}"
         
         Responde de forma breve, técnica y directa.
       `;
       return await generateContentDirect(prompt, false, 0.4);
    } catch (e) { return "El asistente no está disponible en este momento."; }
  },

  // --- HELPERS LEGACY (Para compatibilidad con componentes viejos) ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Por favor utilice la función de receta estructurada."; }
};