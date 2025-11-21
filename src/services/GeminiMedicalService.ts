import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-pro" }) 
    : null;

  /**
   * Genera un resumen médico estructurado e intenta identificar hablantes por contexto.
   */
  static async generateSummary(transcript: string): Promise<string> {
    // 1. Diagnóstico de Error de Configuración
    if (!API_KEY) {
      console.error("CRÍTICO: No se encontró la VITE_GEMINI_API_KEY.");
      throw new Error("Falta la API Key de Gemini. Verifica las variables de entorno en Netlify.");
    }

    if (!this.model) {
      throw new Error("El servicio de IA no pudo inicializarse.");
    }

    if (!transcript || transcript.trim().length < 5) {
        return "La transcripción es demasiado corta para generar un análisis confiable.";
    }

    try {
      // 2. Prompt Avanzado para Separación de Roles (Diarización Contextual)
      const prompt = `
        Actúa como un Asistente Médico Senior experto en documentación clínica.
        
        Tu tarea es analizar la siguiente transcripción cruda de una consulta médica. 
        Dado que la grabación no distingue voces, tú debes inferir quién habla basándote en el contexto (quién hace preguntas médicas vs quién describe síntomas).

        Instrucciones de Salida (Formato Markdown estricto):
        
        --- INICIO REPORTE ---
        
        ### 🗣️ Análisis de Diálogo
        (Reconstruye brevemente el intercambio clave identificando roles)
        * **Dr:** [Resumen de preguntas clave/intervenciones]
        * **Paciente:** [Resumen de respuestas/quejas]

        ### 📋 Resumen Clínico (SOAP)
        * **S (Subjetivo):** Motivo de consulta y síntomas descritos por el paciente.
        * **O (Objetivo):** Signos o datos observables inferidos (si los hay).
        * **A (Análisis):** Posible diagnóstico o impresión clínica basándote en la charla.
        * **P (Plan):** Medicamentos, estudios o recomendaciones mencionadas por el Doctor.

        --- FIN REPORTE ---

        Transcripción a procesar:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error: any) {
      console.error("Error detallado de Gemini:", error);
      
      // Manejo de errores específicos
      if (error.message?.includes('API key')) {
        throw new Error("La API Key de Google es inválida o expiró.");
      }
      if (error.message?.includes('quota')) {
        throw new Error("Se ha excedido la cuota gratuita de la IA por hoy.");
      }
      
      throw new Error("Error conectando con la Inteligencia Artificial.");
    }
  }
}