import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Asegúrate de que la ruta a tus tipos sea correcta.
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// CAMBIO ESTA LÍNEA PARA FORZAR LA DETECCIÓN DE GIT
console.log("🚀 V-DEPLOY: PROMETHEUS ENGINE v2.1 (Gemini 1.5 Flash + Library Fix)");

// ==========================================
// 1. CONFIGURACIÓN DE ALTO NIVEL
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ FATAL: API Key no encontrada en variables de entorno (VITE_GOOGLE_GENAI_API_KEY).");
}

// 🔥 CONFIGURACIÓN DE MODELO
// Usamos 'gemini-1.5-flash' estable. Al forzar el push, la librería actualizada detectará este modelo correctamente.
const MODEL_NAME = "gemini-1.5-flash";

// CONFIGURACIÓN DE SEGURIDAD (GUARDRAILS)
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// ==========================================
// 2. UTILIDADES DE LIMPIEZA & PROCESAMIENTO
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
 * MOTOR DE GENERACIÓN DIRECTO
 */
async function generateContentDirect(prompt: string, jsonMode: boolean = false, tempOverride?: number): Promise<string> {
  if (!API_KEY) {
    throw new Error("Falta la API Key en las variables de entorno.");
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    console.log(`📡 Conectando al núcleo IA: ${MODEL_NAME}...`);
    
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
    const response = await result.response;
    const text = response.text();

    if (text && text.length > 5) {
      return text; 
    }
    
    throw new Error("Google devolvió una respuesta vacía o inválida.");

  } catch (error: any) {
    console.error(`❌ Error en Motor IA (${MODEL_NAME}):`, error);
    throw new Error(`Fallo de IA (${MODEL_NAME}): ${error.message || 'Error de conexión'}`);
  }
}

/**
 * GENERADOR DE PERFILES CLÍNICOS
 */
const getSpecialtyConfig = (specialty: string) => {
  return {
    role: `Escriba Clínico Experto y Auditor de Calidad Médica (MediScribe AI) especializado en ${specialty}`,
    focus: "Generar documentación clínica técnica, legalmente blindada, precisa y basada estrictamente en la evidencia presentada.",
    bias: "Lenguaje probabilístico, objetividad radical y terminología médica formal."
  };
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
        ROL: ${profile.role}.
        OBJETIVO: ${profile.focus}

        🧠 PROTOCOLO DE PENSAMIENTO (CHAIN OF THOUGHT):
        1. Analiza la transcripción identificando hablantes.
        2. Cruza la información con el Historial.
        3. Redacta la nota clínica estructurada.

        ⚠️ REGLAS LEGALES OBLIGATORIAS:
        1. NO DIAGNÓSTICO: Usa lenguaje probabilístico.
        2. EVIDENCIA: Solo incluye en el "Plan" lo que el médico verbalizó.
        3. SUGERENCIAS: Pon recomendaciones no verbalizadas en "clinical_suggestions".
        4. SEGURIDAD: Advierte contraindicaciones en "risk_analysis".

        DATOS DE ENTRADA:
        - HISTORIAL (RAG): "${patientHistory || "No disponible"}"
        - TRANSCRIPCIÓN DE CONSULTA: "${transcript.replace(/"/g, "'").trim()}"

        GENERA UN JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
        {
          "clinicalNote": "Texto narrativo completo de la consulta (Historia Clínica).",
          "soapData": {
            "subjective": "Padecimiento actual e interrogatorio.",
            "objective": "Signos vitales y exploración física.",
            "analysis": "Razonamiento clínico e impresión diagnóstica.",
            "plan": "Tratamiento y estudios verbalizados."
          },
          "clinical_suggestions": [
            "Sugerencia 1",
            "Sugerencia 2"
          ],
          "patientInstructions": "Instrucciones para el paciente.",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación breve."
          },
          "actionItems": {
             "next_appointment": "Fecha o 'A demanda'",
             "urgent_referral": boolean,
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
  // B. ANÁLISIS DE PACIENTE 360
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial reciente.";
      
      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          PACIENTE: ${patientName}.
          HISTORIAL PREVIO: ${historySummary}
          EVOLUCIÓN RECIENTE: ${contextText}

          Analiza la evolución y genera un JSON:
          {
            "evolution": "Resumen narrativo de progreso.",
            "medication_audit": "Análisis de farmacoterapia.",
            "risk_flags": ["Bandera roja 1"],
            "pending_actions": ["Acción pendiente 1"]
          }
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.2);
      return JSON.parse(cleanJSON(rawText)) as PatientInsight;
    } catch (e) {
      console.warn("Fallo parcial en Análisis 360", e);
      return { 
        evolution: "No disponible.", 
        medication_audit: "Sin datos.", 
        risk_flags: [], 
        pending_actions: [] 
      };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN DE MEDICAMENTOS
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text || text.length < 10) return [];
    
    try {
      const prompt = `
        TAREA: Extraer medicamentos.
        TEXTO: "${text.replace(/"/g, "'")}"
        
        Responde SOLO con un Array JSON válido:
        [{ "drug": "...", "details": "...", "frequency": "...", "duration": "..." }]
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return []; 
    }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad Clínica.
        NOTA: "${noteContent}"
        
        JSON esperado: 
        { "riskLevel": "Bajo" | "Medio" | "Alto", "score": 0-100, "analysis": "...", "recommendations": [] }
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.4);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { 
      return { riskLevel: "Bajo", score: 100, analysis: "No disponible", recommendations: [] }; 
    }
  },

  // ---------------------------------------------------------------------------
  // E. PLAN DE SEGUIMIENTO
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        Genera 3 mensajes de WhatsApp para ${patientName}.
        Nota: "${clinicalNote}". Instrucciones: "${instructions}"
        
        JSON Array esperado: 
        [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { 
      return []; 
    }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
          ERES: Asistente médico MediScribe.
          CONTEXTO: ${context}
          PREGUNTA: "${userMessage}"
          Responde breve y técnicamente.
       `;
       return await generateContentDirect(prompt, false, 0.4);
    } catch (e) { 
      return "Asistente no disponible."; 
    }
  },

  // Helpers Legacy
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Función deprecada."; }
};