import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V8.6: RADAR SELECTIVO (Bloqueo de v2.5 Experimental)");

// --- INTERFACES ---
export interface ChatMessage { role: 'user' | 'model'; text: string; }
export interface SoapNote { subjective: string; objective: string; assessment: string; plan: string; suggestions: string[]; }
export interface ConversationLine { speaker: 'Médico' | 'Paciente'; text: string; }
export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; 
  soap?: SoapNote; 
  risk_analysis?: { level: 'Bajo' | 'Medio' | 'Alto', reason: string };
  audit?: { status: 'Incompleto' | 'Completo'; administrative_gaps: string[]; };
  patientInstructions?: string;
  actionItems?: any;
}
export interface MedicationItem { drug: string; details: string; frequency: string; duration: string; notes: string; }
export interface FollowUpMessage { day: number; message: string; }

// --- CONFIGURACIÓN ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";
if (!API_KEY) console.error("⛔ FATAL: Falta API KEY");

// --- PERFILES CLÍNICOS ---
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo", focus: "Hemodinamia y riesgo CV.", bias: "Prioriza impacto hemodinámico." },
    "Traumatología y Ortopedia": { role: "Ortopedista", focus: "Musculoesquelético y movilidad.", bias: "Biomecánica." },
    "Medicina General": { role: "Médico Familiar", focus: "Integral.", bias: "Holístico." }
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: "General", bias: "Clínico" };
};

// --- LIMPIEZA JSON AVANZADA ---
const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const firstSquare = clean.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
      startIndex = firstCurly;
      endIndex = clean.lastIndexOf('}');
  } else if (firstSquare !== -1) {
      startIndex = firstSquare;
      endIndex = clean.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1) {
    clean = clean.substring(startIndex, endIndex + 1);
  }
  return clean.trim();
};

export const GeminiMedicalService = {

  // --- 1. PROTOCOLO RADAR SELECTIVO (CORREGIDO) ---
  async getSmartConfig(): Promise<{ model: string, config: any }> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) return { model: "gemini-1.5-flash-001", config: { responseMimeType: "application/json" } };
      
      const data = await response.json();
      const models = data.models || [];
      
      // 🔥 LA CORRECCIÓN CLAVE ESTÁ AQUÍ 🔥
      // Buscamos explícitamente la familia 1.5 y EXCLUIMOS la 2.5 experimental
      const flash = models.find((m: any) => 
          m.name.includes("flash") && 
          m.name.includes("1.5") &&  // Obligatorio que sea 1.5
          !m.name.includes("2.5") && // Prohibido el 2.5 (Quota Limit)
          !m.name.includes("experimental") // Prohibido experimentales
      );
      
      if (flash) {
        // console.log("✅ Radar: Conectado a", flash.name);
        return { 
            model: flash.name.replace('models/', ''), 
            config: { responseMimeType: "application/json" } 
        };
      }
      
      // Si no encuentra el 1.5 Flash exacto, forzamos el nombre manual seguro
      return { model: "gemini-1.5-flash", config: { responseMimeType: "application/json" } };

    } catch (e) {
      // Fallback de emergencia
      return { model: "gemini-1.5-flash", config: { responseMimeType: "application/json" } };
    }
  },

  // --- 2. GENERAR NOTA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const { model: modelName, config } = await this.getSmartConfig();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
      
      const now = new Date();
      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: ${profile.role}.
        TAREA: Generar Nota de Evolución SOAP.
        TRANSCRIPCIÓN: "${cleanTranscript}"
        FECHA: ${now.toLocaleDateString()}
        HISTORIAL: "${patientHistory}"
        
        IMPORTANTE: Tu salida debe ser ÚNICAMENTE un objeto JSON válido:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "Sintomas...", "objective": "Signos...", "assessment": "Diagnóstico...", "plan": "Tratamiento...", 
            "suggestions": ["Sugerencia 1"] 
          }, 
          "patientInstructions": "Instrucciones...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." } 
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(cleanJSON(response.text())) as GeminiResponse;

    } catch (error) { 
        console.error("Error nota:", error);
        throw error; 
    }
  },

  // --- 3. AUDITORÍA ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    const fallbackResult = { riskLevel: "Medio", score: 50, analysis: "Error IA", recommendations: [] };
    try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

        const prompt = `
          ACTÚA COMO: Auditor Médico. OBJETIVO: Auditar nota.
          NOTA: "${noteContent}"
          JSON: { "riskLevel": "Bajo" | "Medio" | "Alto", "score": 85, "analysis": "...", "recommendations": ["..."] }
        `;
        
        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJSON(result.response.text()));
    } catch (error: any) { return fallbackResult; }
  },

  // --- 4. EXTRACCIÓN MEDICAMENTOS ---
  async extractMedications(transcript: string): Promise<MedicationItem[]> {
    const cleanText = transcript.trim();
    if (!cleanText) return [];
    try {
      const { model: modelName, config } = await this.getSmartConfig();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

      const prompt = `
        Extrae medicamentos de: "${cleanText}".
        JSON Array: [{"drug": "...", "details": "...", "frequency": "...", "duration": "...", "notes": "..."}]
      `;

      const result = await model.generateContent(prompt);
      const items = JSON.parse(cleanJSON(result.response.text()));
      return Array.isArray(items) ? items : [];
    } catch (e) { return []; }
  },

  // --- 5. PLAN DE SEGUIMIENTO ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

        const prompt = `
            Genera 3 mensajes WhatsApp seguimiento para ${patientName}.
            Nota: "${clinicalNote}"
            Instrucciones: "${instructions}"
            JSON Array: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
        `;

        const result = await model.generateContent(prompt);
        const msgs = JSON.parse(cleanJSON(result.response.text()));
        return Array.isArray(msgs) ? msgs : [];
    } catch (e) { return []; }
  },

  // --- 6. ANÁLISIS 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
        
        const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial.";
        const prompt = `
            PACIENTE: ${patientName}. HISTORIAL: ${historySummary}. CONSULTAS: ${contextText}
            JSON: { "evolution": "...", "medication_audit": "...", "risk_flags": [], "pending_actions": [] }
        `;

        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJSON(result.response.text())) as PatientInsight;
      } catch (e) { 
          return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
      }
  },

  // --- MÉTODOS DE SOPORTE ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const { model: modelName } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName }); // Chat no usa config JSON
        const result = await model.generateContent(`Contexto: ${context}. Usuario: ${userMessage}. Responde breve.`);
        return result.response.text();
    } catch (e) { return "Error en chat."; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> { 
      return this.extractMedications(transcript); 
  },
  
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      return this.generatePatient360Analysis(patientName, historySummary, consultations);
  }
};