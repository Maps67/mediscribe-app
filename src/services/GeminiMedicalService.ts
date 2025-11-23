import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

// CAMBIO CRÍTICO: Usamos 'gemini-pro' en lugar de 'gemini-1.5-flash'.
// Este modelo es el estándar universal y no debería dar error 404.
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export const GeminiMedicalService = {
  
  // 1. Generar Nota SOAP
  async generateClinicalNote(transcript: string): Promise<GeminiResponse> {
    try {
      // Ajustamos el prompt para ser ultra explícitos con el JSON, ya que Pro es más literal
      const prompt = `
        Eres un asistente médico. Tu tarea es convertir el siguiente dictado en un objeto JSON.
        
        Dictado: "${transcript}"

        Responde ÚNICAMENTE con este JSON (sin markdown, sin explicaciones):
        {
          "clinicalNote": "Texto de la nota clínica formato SOAP",
          "patientInstructions": "Instrucciones para el paciente",
          "actionItems": {
            "next_appointment": "Fecha sugerida o null",
            "urgent_referral": false,
            "lab_tests_required": []
          }
        }
      `;

      console.log("Conectando con Gemini Pro..."); // Log para verificar intento

      const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error detallado API Google:", errorData);
        throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Fallo desconocido'}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("La IA respondió vacío.");

      // Limpieza agresiva de JSON (Gemini Pro a veces añade ```json al inicio)
      const cleanJson = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      return JSON.parse(cleanJson) as GeminiResponse;

    } catch (error) {
      console.error("Error FATAL en Gemini Service:", error);
      throw error;
    }
  },

  // 2. Generar solo Receta
  async generatePrescriptionOnly(transcript: string): Promise<string> {
    try {
      const prompt = `
        Actúa como médico. Basado en este dictado: "${transcript}", genera SOLO el texto de una receta médica clara.
        Incluye nombre del medicamento, dosis, frecuencia y duración.
        Formato texto plano.
      `;

      const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error("Error al generar receta");

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar receta.";

    } catch (error) {
      console.error("Error generando receta:", error);
      throw error;
    }
  }
};