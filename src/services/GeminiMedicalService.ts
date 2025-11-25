import { GeminiResponse } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-1.5-flash'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// CONFIGURACIÓN DE SEGURIDAD (Vital para medicina)
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

export const GeminiMedicalService = {
  
  // --- 1. RECETA RÁPIDA (Renombrada para compatibilidad) ---
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    if (!API_KEY) return "Error: Falta API Key";

    const prompt = `
      ACTÚA COMO: Asistente Médico experto en ${specialty}.
      TAREA: Transforma este dictado en una receta médica formal (texto plano para PDF).
      REGLAS:
      1. Lista medicamentos, dosis y frecuencia. Si faltan dosis, sugiere la estándar.
      2. Agrega recomendaciones de seguridad breves.
      3. NO incluyas saludos ni datos del doctor (ya están en el papel).
      
      DICTADO: "${transcript}"
    `;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          safetySettings: SAFETY_SETTINGS
        })
      });

      if (!response.ok) throw new Error(`Error API: ${response.status}`);

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || transcript;
      
      // Limpieza estética
      return text.replace(/#/g, "").replace(/\*\*/g, "").trim();

    } catch (error) {
      console.error("QuickRx Error:", error);
      return `Error técnico: ${(error as Error).message}`; 
    }
  },

  // --- 2. NOTA CLÍNICA (SOAP) ---
  async generateClinicalNote(transcript: string, specialty: string = 'Medicina General'): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API Key");

    const prompt = `
      Actúa como un médico especialista en ${specialty}.
      Analiza esta consulta y devuelve UNICAMENTE un JSON válido con esta estructura exacta:
      {
        "clinicalNote": "Nota SOAP técnica y detallada.",
        "patientInstructions": "Indicaciones claras y empáticas para el paciente.",
        "actionItems": { 
            "next_appointment": null, 
            "urgent_referral": false, 
            "lab_tests_required": [] 
        }
      }
      
      Transcripción: "${transcript}"
    `;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          safetySettings: SAFETY_SETTINGS,
          // CLAVE: Forzamos modo JSON para evitar errores de parseo
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Error de Google');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("La IA no devolvió texto.");

      // Limpieza por si acaso
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(jsonString) as GeminiResponse;

    } catch (error) {
      console.error("Service Error:", error);
      throw error;
    }
  },

  // --- 3. CHAT CON CONTEXTO ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    if (!API_KEY) return "Error: Sin API Key";

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `CONTEXTO MÉDICO:\n${context}\n\nPREGUNTA:\n${userMessage}` }] }],
          safetySettings: SAFETY_SETTINGS
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
    } catch (error) {
      return "Error de conexión.";
    }
  }
};