import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  // Validación inicial
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  // Usamos 'gemini-1.5-flash' que es más rápido y estable para texto
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    // 1. Diagnóstico claro de falta de llave
    if (!API_KEY) {
      console.error("CRÍTICO: API Key no encontrada en variables de entorno.");
      throw new Error("Falta la API Key (VITE_GEMINI_API_KEY). Configúrala en Netlify.");
    }

    if (!this.model) {
      throw new Error("El servicio de IA no pudo inicializarse correctamente.");
    }

    try {
      let focusInstruction = "";
      switch (specialty) {
        case "Cardiología": focusInstruction = "Enfócate en síntomas cardiovasculares, factores de riesgo y hemodinamia."; break;
        case "Pediatría": focusInstruction = "Enfócate en desarrollo, alimentación y menciona a los padres/tutores."; break;
        case "Psicología/Psiquiatría": focusInstruction = "Realiza un examen mental, enfócate en estado de ánimo y afecto."; break;
        default: focusInstruction = "Realiza un abordaje integral clínico.";
      }

      const prompt = `
        Actúa como un Especialista en ${specialty}.
        ${focusInstruction}
        
        Analiza esta transcripción y genera una Nota Clínica SOAP formal.
        
        ### 🗣️ Diálogo
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
      console.error("Gemini Error Completo:", error);
      
      // Extraer mensaje real del error para mostrarlo al usuario
      const rawMessage = error.message || error.toString();
      
      if (rawMessage.includes('API key')) return "Error: Tu API Key no es válida o ha sido desactivada en Google Cloud.";
      if (rawMessage.includes('quota')) return "Error: Se acabó el saldo gratuito de la IA por hoy.";
      if (rawMessage.includes('fetch')) return "Error: Falló la conexión a internet.";
      
      // Devolver el error técnico para que sepamos qué pasa
      throw new Error(`Error IA: ${rawMessage}`);
    }
  }
}