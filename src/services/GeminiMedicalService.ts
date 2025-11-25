import { GoogleGenerativeAI } from "@google/generative-ai";

// --- INTERFACES LOCALES (Para asegurar compatibilidad total) ---
export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: {
    next_appointment: string | null;
    urgent_referral: boolean;
    lab_tests_required: string[];
  };
}

export interface FollowUpMessage {
  day: number;
  message: string;
}

// 1. CONFIGURACIÓN SEGURA
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let model: any = null;

if (API_KEY) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Usamos 'gemini-1.5-flash' directamente por ser el más rápido y estable actualmente
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
        console.error("Error fatal iniciando SDK Gemini:", error);
    }
} else {
    console.error("🚨 FALTA API KEY en .env");
}

export const GeminiMedicalService = {

  // --- MÓDULO 1: RECETA RÁPIDA PROACTIVA (La que arreglamos) ---
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    if (!API_KEY || !model) return "ERROR: Sistema de IA no disponible. Verifique API Key.";

    try {
        const prompt = `
        ROL: Asistente Médico Experto en ${specialty}.
        TAREA: Redactar receta formal basada en: "${transcript}"
        
        INSTRUCCIONES CLÍNICAS:
        1. Detecta medicamentos. Si falta dosis/frecuencia, SUGIERE la estándar segura.
        2. Agrega recomendaciones breves de seguridad.
        
        FORMATO (TEXTO PLANO PARA PDF):
        [Medicamento] [Concentración] [Forma]
        Indicación: [Dosis, Frecuencia, Duración]
        
        Notas:
        - [Recomendación breve]
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        return text.replace(/#/g, "").replace(/\*\*/g, "").replace(/---/g, "").trim();
    } catch (error: any) {
        console.error("Error QuickRx:", error);
        return `Error al generar: ${error.message}`;
    }
  },

  // --- MÓDULO 2: NOTA CLÍNICA SOAP (Robusta) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!model) throw new Error("IA no inicializada");

    try {
      const prompt = `
        Actúa como Médico Especialista en ${specialty}.
        Analiza este dictado: "${transcript}"

        Genera JSON ESTRICTO:
        {
          "clinicalNote": "Nota SOAP completa y técnica.",
          "patientInstructions": "Instrucciones claras y empáticas.",
          "actionItems": {
            "next_appointment": "Fecha sugerida o null",
            "urgent_referral": false,
            "lab_tests_required": ["lista", "de", "tests"]
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text) as GeminiResponse;
    } catch (error) {
      console.error("Error FullConsult:", error);
      throw error;
    }
  },

  // --- MÓDULO 3: PLAN DE SEGUIMIENTO (Migrado a SDK) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    if (!model) return [];

    try {
        const prompt = `
          Experto en fidelización médica. Crea 3 mensajes de WhatsApp para el paciente ${patientName}.
          Contexto: ${clinicalNote}. Indicaciones: ${instructions}.
          
          Reglas:
          - Mensajes para día 3, 7 y 30.
          - Formato JSON Array: [{"day": 3, "message": "..."}, ...]
          - Tono: Profesional y empático.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text) as FollowUpMessage[];
    } catch (error) {
        console.error("Error FollowUp:", error);
        return [];
    }
  },

  // --- MÓDULO 4: CHAT CON CONTEXTO (Migrado a SDK) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    if (!model) return "IA no disponible.";

    try {
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: `CONTEXTO MÉDICO:\n${context}` }] },
                { role: "model", parts: [{ text: "Entendido. Responderé basado en ese contexto." }] }
            ]
        });

        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("Error Chat:", error);
        return "No pude procesar la respuesta.";
    }
  }
};