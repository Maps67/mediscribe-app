import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  // Usamos flash por velocidad y costo
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<{clinicalNote: string, patientInstructions: string}> {
    if (!API_KEY) throw new Error("Falta API Key.");
    if (!this.model) throw new Error("Error servicio IA.");

    try {
      // PROMPT DE INGENIERÍA AVANZADA
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        
        Tu tarea es analizar la transcripción y generar DOS salidas separadas.
        
        1. NOTA CLÍNICA (Técnica, para el expediente médico, formato SOAP).
        2. INSTRUCCIONES AL PACIENTE (Lenguaje sencillo, empático, claro, lista de tareas, dieta o cuidados).

        IMPORTANTE: Debes separar ambas secciones con la etiqueta exacta "--- SEPARADOR ---".

        Transcripción:
        "${transcript}"

        FORMATO DE RESPUESTA REQUERIDO:
        
        ### Resumen Clínico (${specialty})
        **S:** ...
        **O:** ...
        **A:** ...
        **P:** ...

        --- SEPARADOR ---

        Hola! Aquí tienes el resumen de tu consulta y mis indicaciones:
        
        💊 **Tratamiento:**
        ...
        
        🥗 **Cuidados y Recomendaciones:**
        ...
        
        ⚠️ **Signos de Alerta:**
        ...
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const fullText = response.text();

      // PARSEO INTELIGENTE: Separamos el texto en dos variables
      const parts = fullText.split("--- SEPARADOR ---");
      
      return {
        clinicalNote: parts[0].trim(),
        patientInstructions: parts[1] ? parts[1].trim() : "No se generaron instrucciones específicas."
      };
      
    } catch (error: any) {
      console.error("Error Gemini:", error);
      throw new Error("Error al generar la nota inteligente.");
    }
  }
}