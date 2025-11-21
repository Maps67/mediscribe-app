import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  // Inicialización
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  // VOLVEMOS A 'gemini-pro' (El modelo más compatible y estable)
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-pro" }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    // 1. Validación de Llave
    if (!API_KEY) {
      return "Error CRÍTICO: No hay API Key configurada en Netlify. (Variable VITE_GEMINI_API_KEY vacía)";
    }

    if (!this.model) {
      return "Error: No se pudo conectar con el servicio de Google.";
    }

    try {
      let focusInstruction = "";
      switch (specialty) {
        case "Cardiología": focusInstruction = "Enfócate en síntomas cardiovasculares."; break;
        case "Pediatría": focusInstruction = "Enfócate en desarrollo y alimentación."; break;
        case "Psicología/Psiquiatría": focusInstruction = "Realiza un examen mental."; break;
        default: focusInstruction = "Realiza un abordaje integral.";
      }

      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        ${focusInstruction}
        
        Analiza el siguiente texto y genera una Nota Clínica SOAP.
        
        ### 🗣️ Diálogo Detectado
        * **Médico:** ...
        * **Paciente:** ...

        ### 📋 Nota Clínica (${specialty})
        * **S (Subjetivo):** ...
        * **O (Objetivo):** ...
        * **A (Análisis):** ...
        * **P (Plan):** ...

        Transcripción:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
      
    } catch (error: any) {
      console.error("Gemini Error Real:", error);
      
      // AQUI ESTA EL CAMBIO: Mostramos el error crudo para diagnosticar
      const rawMessage = error.message || error.toString();
      
      // Si es problema de la llave, avisamos claro
      if (rawMessage.includes('400') || rawMessage.includes('403')) {
        return `Error de Acceso (${rawMessage}): Tu API Key es rechazada por Google. Genera una nueva en aistudio.google.com`;
      }
      
      return `Error Técnico: ${rawMessage}`;
    }
  }
}