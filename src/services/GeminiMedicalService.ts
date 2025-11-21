import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  // CORRECCIÓN: Cambiamos 'gemini-pro' (obsoleto) por 'gemini-1.5-flash' (actual)
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    if (!API_KEY) {
      return "Error CRÍTICO: No hay API Key configurada. Revisa tus variables en Netlify.";
    }

    if (!this.model) {
      return "Error: No se pudo inicializar el modelo de IA.";
    }

    try {
      let focusInstruction = "";
      switch (specialty) {
        case "Cardiología": focusInstruction = "Enfócate en síntomas cardiovasculares y factores de riesgo."; break;
        case "Pediatría": focusInstruction = "Enfócate en desarrollo, vacunación y alimentación."; break;
        case "Psicología/Psiquiatría": focusInstruction = "Realiza un examen mental y evalúa el estado de ánimo."; break;
        default: focusInstruction = "Realiza un abordaje clínico integral (SOAP).";
      }

      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        ${focusInstruction}
        
        Tu tarea: Analizar el siguiente texto transcrito y generar una Nota Clínica formal.
        
        ### 🗣️ Análisis del Diálogo
        (Identifica quién es el médico y quién el paciente por el contexto)
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
      console.error("Gemini Error:", error);
      const msg = error.message || error.toString();
      
      // Mensajes amigables para errores comunes
      if (msg.includes('404')) return "Error: El modelo de IA cambió. (Ya corregido en código, recarga la página).";
      if (msg.includes('API key')) return "Error: Tu API Key no es válida para Gemini 1.5 Flash. Genera una nueva en Google AI Studio.";
      
      return `Error Técnico: ${msg}`;
    }
  }
}