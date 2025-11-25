import { GeminiResponse, FollowUpMessage } from "../types";

// 1. CONSTANTES MAESTRAS
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_ID = "gemini-1.5-flash"; // Modelo fijo y estable
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

if (!API_KEY) {
  console.error("🚨 ERROR CRÍTICO: Falta VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  /**
   * MÓDULO 1: RECETA RÁPIDA (QuickRx)
   * Genera solo el texto de la receta para el modal rápido.
   */
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    if (!API_KEY) return "Error: Falta configuración de API Key.";

    try {
      const prompt = `
        ACTÚA COMO: Asistente Médico experto en ${specialty}.
        TAREA: Redactar receta médica formal (texto plano) basada en: "${transcript}"
        
        INSTRUCCIONES:
        1. Detecta medicamentos. Si falta dosis/frecuencia, SUGIERE la estándar.
        2. Agrega recomendaciones breves de seguridad.
        3. NO incluyas saludos ni datos del doctor (ya están en el papel).
        
        SALIDA: Texto plano listo para PDF.
      `;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || "Error de conexión con Google");
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar.";
      
      // Limpieza estética
      return text.replace(/#/g, "").replace(/\*\*/g, "").replace(/---/g, "").trim();

    } catch (error: any) {
      console.error("❌ Error QuickRx:", error);
      return `Error técnico: ${error.message}`;
    }
  },

  /**
   * MÓDULO 2: CONSULTA COMPLETA (SOAP)
   * Genera el expediente completo con formato JSON estricto.
   */
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API Key");

    try {
      const prompt = `
        Actúa como Médico Especialista en ${specialty}.
        Analiza: "${transcript}"

        Responde ÚNICAMENTE con este JSON estricto:
        {
          "clinicalNote": "Nota SOAP completa y técnica.",
          "patientInstructions": "Instrucciones claras y empáticas.",
          "actionItems": {
            "next_appointment": null,
            "urgent_referral": false,
            "lab_tests_required": []
          }
        }
      `;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error en petición a Google");
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("La IA devolvió una respuesta vacía.");

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error SOAP:", error);
      throw error;
    }
  },

  /**
   * MÓDULO 3: CHAT CON CONTEXTO
   */
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    if (!API_KEY) return "Error: Sin API Key";

    try {
      const prompt = `
        CONTEXTO MÉDICO: ${context}
        PREGUNTA: "${userMessage}"
        Responde breve y profesionalmente.
      `;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error en Chat");
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
    } catch (error) {
      return "Error de conexión.";
    }
  },

  // Módulo fantasma para evitar errores de importación si algo lo llama
  async generateFollowUpPlan(): Promise<FollowUpMessage[]> {
      return [];
  }
};