import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-pro" }) 
    : null;

  /**
   * Genera un resumen médico adaptado a la especialidad seleccionada.
   */
  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    if (!API_KEY) throw new Error("Falta la API Key de Gemini.");
    if (!this.model) throw new Error("Servicio de IA no inicializado.");
    if (!transcript || transcript.trim().length < 5) return "Transcripción insuficiente.";

    try {
      // Definimos el "Lente Clínico" según la especialidad
      let focusInstruction = "";
      
      switch (specialty) {
        case "Cardiología":
          focusInstruction = "Enfócate prioritariamente en síntomas cardiovasculares (disnea, dolor torácico, palpitaciones), factores de riesgo, y mediciones hemodinámicas mencionadas.";
          break;
        case "Pediatría":
          focusInstruction = "Enfócate en el desarrollo, alimentación, vacunación, y refiere al paciente como 'el paciente pediátrico' o 'el niño/a'. Menciona siempre a los padres/tutores si intervienen.";
          break;
        case "Psicología/Psiquiatría":
          focusInstruction = "Realiza un examen mental basado en el discurso. Enfócate en el estado de ánimo, afecto, percepción, cognición y riesgo suicida si se menciona.";
          break;
        case "Ginecología":
          focusInstruction = "Enfócate en antecedentes gineco-obstétricos, ciclo menstrual, anticoncepción y síntomas pélvicos.";
          break;
        default: // Medicina General
          focusInstruction = "Realiza un abordaje integral cubriendo todos los sistemas mencionados.";
      }

      const prompt = `
        Actúa como un **Especialista en ${specialty}** experto en redacción clínica.
        
        INSTRUCCIÓN DE ESPECIALIDAD: ${focusInstruction}

        Tu tarea es convertir la siguiente transcripción (que puede tener errores de audio) en una Nota de Evolución Clínica formal y profesional.
        
        Instrucciones de Estructura (Markdown):
        
        ### 🗣️ Análisis de Interacción (Diarización Inferida)
        * **Médico (${specialty}):** [Resumen de intervenciones clave]
        * **Paciente:** [Resumen de motivos y respuestas]

        ### 📋 Nota Clínica (${specialty})
        * **S (Subjetivo):** Motivo de consulta y padecimiento actual con terminología médica técnica propia de ${specialty}.
        * **O (Objetivo):** Signos vitales o hallazgos físicos mencionados (si no se mencionan, indicar "No mencionados en audio").
        * **A (Análisis/Diagnóstico):** Impresión diagnóstica basada en el contexto.
        * **P (Plan):** Tratamiento, estudios solicitados y recomendaciones.

        Transcripción:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
      
    } catch (error: any) {
      console.error("Gemini Error:", error);
      if (error.message?.includes('quota')) throw new Error("Cuota de IA excedida.");
      throw new Error("Error al procesar la consulta con IA.");
    }
  }
}