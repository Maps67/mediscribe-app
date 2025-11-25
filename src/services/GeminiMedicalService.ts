import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializamos Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- INTERFACES ---
interface ConsultationResponse {
  soapNote: string;
  prescription: string;
  recommendations: string;
}

export const GeminiMedicalService = {
  
  /**
   * Genera una Receta Rápida (QuickRx) limpia y directa.
   * ELIMINA: Saludos, placeholders, datos del doctor (ya están en el PDF).
   * MANTIENE: Solo medicamentos e indicaciones.
   */
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    try {
        const prompt = `
        ACTÚA COMO: Un asistente clínico robotizado experto en farmacología.
        CONTEXTO: Tu salida se imprimirá DIRECTAMENTE en el cuerpo de una receta médica PDF que YA TIENE membrete, logo, nombre del doctor, fecha y datos del paciente.
        
        TU TAREA:
        Analiza el siguiente texto dictado por el médico: "${transcript}"
        Extrae y redecta ÚNICAMENTE la prescripción médica formal.

        REGLAS DE ORO (OBLIGATORIAS):
        1. NO incluyas saludos, despedidas ni introducciones (Ej: "Aquí tienes la receta", "Claro doctor").
        2. NO incluyas datos del médico, ni firma, ni fecha, ni datos del paciente. (ESTÁN PROHIBIDOS).
        3. NO uses Markdown complejo (negritas **, cursivas _, titulos #). Usa texto plano limpio.
        4. SI EL MÉDICO DICTA SINTOMAS, IGNÓRALOS. Solo redacta el tratamiento.
        
        FORMATO DE SALIDA REQUERIDO:
        Medicamento: [Nombre] [Concentración]
        Tomar: [Dosis] vía [Vía de administración] cada [Frecuencia] por [Duración].
        Nota: [Indicación adicional si la hay].

        (Repetir para cada medicamento si hay varios).
        
        SI NO HAY MEDICAMENTOS EN EL TEXTO:
        Responde únicamente: "No se detectaron medicamentos en el dictado."
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Limpieza de seguridad post-IA (por si la IA desobedece)
        text = text.replace(/\*\*/g, "").replace(/#/g, "").replace(/---/g, ""); // Quitar markdown residual
        text = text.replace(/\[.*?\]/g, (match) => match); // Mantener corchetes si son parte de la dosis, pero la IA debería llenarlos.
        
        return text.trim();

    } catch (error) {
        console.error("Error generando QuickRx:", error);
        return "Error al generar la receta. Por favor, edite manualmente.";
    }
  },

  /**
   * Genera la Consulta Completa (SOAP + Receta + Recomendaciones).
   * Mantiene la lógica anterior pero reforzada.
   */
  async generateConsultationNote(transcript: string, specialty: string): Promise<ConsultationResponse> {
    try {
      const prompt = `
        Eres un asistente médico experto en ${specialty}.
        Analiza la siguiente transcripción de una consulta médica:
        "${transcript}"

        Genera un objeto JSON ESTRICTO con la siguiente estructura (sin bloques de código, solo el JSON):
        {
          "soapNote": "Redacta la nota clínica en formato SOAP (Subjetivo, Objetivo, Análisis, Plan). Formal y profesional.",
          "prescription": "SOLO el listado de medicamentos e indicaciones de toma. SIN saludos, SIN datos del doctor, SIN cabeceras.",
          "recommendations": "Recomendaciones no farmacológicas (dieta, ejercicios, alarmas) claras para el paciente."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Limpiar el texto para asegurar que sea JSON válido (quitar ```json y ```)
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      return JSON.parse(cleanJson);

    } catch (error) {
      console.error("Error en Gemini Full Consult:", error);
      return {
        soapNote: "Error al generar nota. Revise la transcripción.",
        prescription: "Error al generar receta.",
        recommendations: "No disponibles."
      };
    }
  }
};