// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: {
    next_appointment: string | null;
    urgent_referral: boolean;
    lab_tests_required: string[];
  };
}

export const GeminiMedicalService = {
  
  // 1. Método de Receta Rápida (Minimalista con Fetch)
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    try {
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      
      const prompt = `
        ACTÚA COMO: Asistente Médico.
        TAREA: Redactar receta médica limpia basada en: "${transcript}"
        SALIDA: Texto plano con medicamentos, dosis y recomendaciones breves. Sin saludos.
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar receta.";
    } catch (error) {
      console.error(error);
      return "Error de conexión con IA.";
    }
  },

  // 2. Método de Consulta Completa (Minimalista con Fetch)
  async generateClinicalNote(transcript: string, specialty: string): Promise<GeminiResponse> {
    try {
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      
      const prompt = `
        Analiza: "${transcript}"
        Responde SOLO JSON:
        {
          "clinicalNote": "Nota SOAP",
          "patientInstructions": "Indicaciones",
          "actionItems": { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  // 3. Método de Chat (Minimalista con Fetch)
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      const prompt = `Contexto: ${context}. Pregunta: ${userMessage}`;
      
      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (error) {
      return "Error en chat.";
    }
  }
};