import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) 
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
        3. EXTRAER "ITEMS DE ACCIÓN" en formato JSON estricto para automatizar el seguimiento.

        FORMATO DE SALIDA OBLIGATORIO (Respeta los separadores):

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
          "next_appointment": "Sugiere una fecha relativa (ej: 'En 2 semanas') o null si no se requiere",
          "urgent_referral": true/false (true si detectas síntomas de alarma que requieren urgencias o especialista inmediato),
          "lab_tests_required": ["Lista", "de", "estudios", "mencionados", "como strings"]
        }
        
        IMPORTANTE: El JSON debe ser válido y estar limpio sin texto adicional después del separador.

        Transcripción:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const fullText = response.text();

      // PARSEO INTELIGENTE
      // 1. Dividimos por los separadores
      const parts = fullText.split("--- SEPARADOR_INSTRUCCIONES ---");
      const clinicalNote = parts[0].trim();
      
      // 2. Separamos instrucciones de JSON
      let patientInstructions = "";
      let actionItems: ActionItems = { next_appointment: null, urgent_referral: false, lab_tests_required: [] };

      if (parts[1]) {
        const jsonParts = parts[1].split("--- SEPARADOR_JSON ---");
        patientInstructions = jsonParts[0].trim();
        
        if (jsonParts[1]) {
          try {
            // Limpiamos bloques de código markdown si la IA los pone
            const cleanJson = jsonParts[1].replace(/```json/g, '').replace(/```/g, '').trim();
            actionItems = JSON.parse(cleanJson);
          } catch (e) {
            console.error("Error parseando JSON de acciones:", e);
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
      throw new Error(`Error IA: ${error.message}`);
    }
  }
}