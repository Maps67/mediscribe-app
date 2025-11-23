import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "../types";

// Inicialización segura de la API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const GeminiMedicalService = {
  
  // 1. FUNCIÓN PRINCIPAL: Generar Nota SOAP + Instrucciones
  async generateClinicalNote(transcript: string): Promise<GeminiResponse> {
    try {
      const prompt = `
        Actúa como un médico experto. Transforma el siguiente dictado de consulta en un formato estructurado JSON.
        
        Dictado: "${transcript}"

        Requisitos de salida (JSON estricto):
        1. "clinicalNote": Redacta una nota clínica formal (Formato SOAP: Subjetivo, Objetivo, Análisis, Plan). Usa lenguaje médico técnico.
        2. "patientInstructions": Redacta instrucciones claras y empáticas dirigidas directamente al paciente (Tú debes...). Incluye medicamentos (dosis/frecuencia) y cuidados generales. Usa lenguaje sencillo.
        3. "actionItems": Extrae acciones futuras.
           - "next_appointment": Sugerencia de fecha (texto) o null.
           - "urgent_referral": boolean.
           - "lab_tests_required": Array de strings con estudios solicitados.

        Responde SOLO con el JSON válido, sin bloques de código markdown.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Limpieza de respuesta para asegurar JSON válido
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson) as GeminiResponse;
    } catch (error) {
      console.error("Error en Gemini Service:", error);
      throw new Error("No se pudo generar la nota clínica.");
    }
  },

  // 2. FUNCIÓN AUXILIAR: Generar solo Receta (Para el botón de Receta Rápida)
  async generatePrescriptionOnly(transcript: string): Promise<string> {
    try {
      const prompt = `
        Actúa como médico. Basado en este dictado: "${transcript}", genera SOLO el texto de una receta médica clara.
        Incluye nombre del medicamento, dosis, frecuencia y duración.
        Si hay indicaciones de cuidados (dieta, reposo), inclúyelas al final.
        Formato texto plano, listo para imprimir.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generando receta:", error);
      throw error;
    }
  }
};