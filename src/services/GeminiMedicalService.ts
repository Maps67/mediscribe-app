import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  // SOLUCIÓN: Usamos 'gemini-pro' (El estándar estable)
  // Si este falla, es problema 100% de la API Key, no del modelo.
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-pro" }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta la API Key. Revisa la configuración en Netlify.");
    if (!this.model) throw new Error("Error al iniciar el servicio de IA.");

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        
        TU OBJETIVO:
        1. Generar una Nota Clínica SOAP técnica.
        2. Generar Instrucciones claras para el paciente.
        3. EXTRAER "ITEMS DE ACCIÓN" en formato JSON estricto.

        FORMATO DE SALIDA OBLIGATORIO (Usa estos separadores exactos):

        ### Resumen Clínico (${specialty})
        **S:** ...
        **O:** ...
        **A:** ...
        **P:** ...

        --- SEPARADOR_INSTRUCCIONES ---

        Hola! Aquí tienes tus indicaciones:
        ... (Instrucciones para paciente)

        --- SEPARADOR_JSON ---
        
        {
          "next_appointment": "Texto fecha sugerida o null",
          "urgent_referral": false,
          "lab_tests_required": ["Lista", "de", "estudios"]
        }
        
        IMPORTANTE: La parte final debe ser SOLO JSON válido, sin texto extra.

        Transcripción:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const fullText = response.text();

      // PARSEO ROBUSTO
      const parts = fullText.split("--- SEPARADOR_INSTRUCCIONES ---");
      const clinicalNote = parts[0] ? parts[0].trim() : "Error generando nota.";
      
      let patientInstructions = "";
      let actionItems: ActionItems = { next_appointment: null, urgent_referral: false, lab_tests_required: [] };

      if (parts[1]) {
        const jsonParts = parts[1].split("--- SEPARADOR_JSON ---");
        patientInstructions = jsonParts[0] ? jsonParts[0].trim() : "";
        
        if (jsonParts[1]) {
          try {
            // Limpieza agresiva para asegurar que 'gemini-pro' no rompa el JSON
            const cleanJson = jsonParts[1]
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim();
            actionItems = JSON.parse(cleanJson);
          } catch (e) {
            console.warn("La IA generó un JSON inválido, se usarán valores por defecto.");
          }
        }
      }
      
      return {
        clinicalNote,
        patientInstructions,
        actionItems
      };
      
    } catch (error: any) {
      console.error("Error Gemini:", error);
      // Mensaje de error transparente
      throw new Error(`Fallo IA (${error.message || "Desconocido"}). Verifica tu API Key.`);
    }
  }
}