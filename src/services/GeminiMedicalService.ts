import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// LISTA DE PRIORIDAD DE MODELOS
// El sistema intentará usarlos en este orden. Si el primero falla, salta al segundo.
const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro"];

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    // 1. Validación estricta de credenciales
    if (!API_KEY) {
      throw new Error("CRÍTICO: Falta la API Key. Configure VITE_GEMINI_API_KEY en Netlify.");
    }

    if (!this.genAI) {
      throw new Error("Error interno: No se pudo inicializar el cliente de Google AI.");
    }

    // 2. Definición del Prompt (Instrucciones)
    let focusInstruction = "";
    switch (specialty) {
      case "Cardiología": focusInstruction = "Enfócate en síntomas cardiovasculares, factores de riesgo y hemodinamia."; break;
      case "Pediatría": focusInstruction = "Enfócate en desarrollo, alimentación y menciona a los padres/tutores."; break;
      case "Psicología/Psiquiatría": focusInstruction = "Realiza un examen mental, enfócate en estado de ánimo y afecto."; break;
      default: focusInstruction = "Realiza un abordaje integral clínico (SOAP).";
    }

    const prompt = `
      Actúa como un Médico Especialista en ${specialty}.
      ${focusInstruction}
      
      Analiza la siguiente transcripción y genera una Nota Clínica formal y estructurada.
      Importante: Identifica quién es el médico y quién el paciente por el contexto de lo que dicen.

      ### 🗣️ Análisis del Diálogo
      * **Médico:** [Resumen de intervenciones]
      * **Paciente:** [Resumen de síntomas/respuestas]

      ### 📋 Nota Clínica (${specialty})
      * **S (Subjetivo):** ...
      * **O (Objetivo):** ...
      * **A (Análisis):** ...
      * **P (Plan):** ...

      Transcripción:
      "${transcript}"
    `;

    // 3. ESTRATEGIA DE CASCADA (Definitiva)
    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        // Intentamos conectar con el modelo actual del ciclo
        const model = this.genAI.getGenerativeModel({ 
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Si llegamos aquí, funcionó. Retornamos y rompemos el ciclo.
        return text;

      } catch (error: any) {
        console.warn(`Fallo con el modelo ${modelName}:`, error.message);
        lastError = error;
        
        // Si el error es de CUOTA o API KEY, no sirve de nada intentar otro modelo, fallará igual.
        if (error.message?.includes('API key') || error.message?.includes('quota')) {
           throw new Error(error.message.includes('API key') ? "API Key inválida." : "Cuota gratuita excedida.");
        }
        // Si es un 404 (Modelo no encontrado), el ciclo continuará automáticamente al siguiente modelo.
      }
    }

    // Si termina el ciclo y ninguno funcionó
    console.error("Todos los modelos fallaron.");
    throw new Error(`No se pudo generar la nota. Detalle técnico: ${lastError?.message || "Error de conexión Google."}`);
  }
}