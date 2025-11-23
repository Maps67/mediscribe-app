import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Configuración de reintento inteligente
async function generateWithFallback(prompt: string, isJson: boolean = true) {
  // Intento 1: Usar el modelo FLASH (Rápido y económico)
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response;
  } catch (error: any) {
    console.warn("Fallo el modelo Flash, intentando con Pro...", error);
    
    // Intento 2: Si falla (Error 404/503), usar el modelo PRO (Estándar robusto)
    if (error.message?.includes('404') || error.message?.includes('not found')) {
       const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
       const result = await fallbackModel.generateContent(prompt);
       return result.response;
    }
    throw error; // Si es otro error (ej. sin internet), lanzarlo.
  }
}

export const GeminiMedicalService = {
  
  // 1. Generar Nota SOAP
  async generateClinicalNote(transcript: string): Promise<GeminiResponse> {
    try {
      const prompt = `
        Actúa como un médico experto. Transforma el siguiente dictado de consulta en un formato estructurado JSON.
        
        Dictado: "${transcript}"

        Requisitos de salida (JSON estricto):
        1. "clinicalNote": Redacta una nota clínica formal (Formato SOAP).
        2. "patientInstructions": Redacta instrucciones claras para el paciente.
        3. "actionItems": 
           - "next_appointment": Sugerencia de fecha (texto) o null.
           - "urgent_referral": boolean.
           - "lab_tests_required": Array de strings.

        Responde SOLO con el JSON válido, sin bloques de código markdown.
      `;

      // Usamos la función con fallback
      const response = await generateWithFallback(prompt);
      const text = response.text();
      
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
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

      const response = await generateWithFallback(prompt, false);
      return response.text();
    } catch (error) {
      console.error("Error generando receta:", error);
      throw error;
    }
  }
};