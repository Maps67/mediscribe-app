import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  private static async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) throw new Error("Error validando API Key");

      const data = await response.json();
      const validModels = data.models?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));

      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name;

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name;

      if (validModels.length > 0) return validModels[0].name;
      throw new Error("Sin modelos disponibles.");

    } catch (error) {
      console.warn("Fallo auto-discovery, usando default.");
      return "models/gemini-1.5-flash"; 
    }
  }

  static async generateSummary(transcript: string, specialty: string = "Medicina General", historyContext: string = ""): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API Key en Netlify.");

    const activeModelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      // --- PROMPT DE INGENIERÍA CLÍNICA AVANZADA ---
      const prompt = `
        Actúa como un Médico Especialista en ${specialty} con enfoque en precisión clínica.
        
        TIENES ACCESO AL HISTORIAL: "${historyContext || 'Sin historial relevante.'}"
        TRANSCRIPCIÓN ACTUAL: "${transcript}"

        TU TAREA ES GENERAR 3 SALIDAS ESTRUCTURADAS:

        1. ### NOTA TÉCNICA (SOAP):
           - Lenguaje médico formal para el expediente.
           - Incluye evolución si hay historial previo.

        2. ### INDICACIONES AL PACIENTE (La Receta/Guía):
           - OBJETIVO: Instrucciones claras, directas y ejecutables.
           - PROHIBIDO: No saludes ("Hola Juan"), no des explicaciones emocionales ("Entiendo que te duele"), no resumas la charla.
           - FORMATO OBLIGATORIO:
             * 💊 **Esquema Farmacológico:** Lista de medicamentos con dosis, frecuencia y duración.
             * 🥗 **Medidas Generales:** Dieta, actividad física, cuidados.
             * ⚠️ **Signos de Alarma:** Cuándo acudir a urgencias.
           - LÓGICA QUIRÚRGICA: Si detectas que es una CIRUGÍA (pre o post), agrega una sección **"CUIDADOS DE HERIDA/QUIRÚRGICOS"** (manejo de drenajes, curaciones, retiro de puntos, faja, etc.).

        3. ### ACTION ITEMS (JSON):
           - Extrae datos para automatización.

        --- SEPARADOR_INSTRUCCIONES --- (Usa este separador exacto)

        [Aquí van las INDICACIONES AL PACIENTE siguiendo las reglas de arriba]

        --- SEPARADOR_JSON ---

        {
          "next_appointment": "Texto fecha o null",
          "urgent_referral": false,
          "lab_tests_required": ["Lista", "de", "estudios"]
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Error: ${errorData.error?.message}`);
      }

      const data = await response.json();
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!fullText) throw new Error("Respuesta vacía de la IA.");

      return this.parseResponse(fullText);

    } catch (error: any) {
      console.error("Fallo Generación:", error);
      throw new Error(`${error.message}`);
    }
  }

  private static parseResponse(fullText: string): GeminiResponse {
    const parts = fullText.split("--- SEPARADOR_INSTRUCCIONES ---");
    const clinicalNote = parts[0] ? parts[0].trim() : "Error de formato.";
    let patientInstructions = "";
    let actionItems: ActionItems = { next_appointment: null, urgent_referral: false, lab_tests_required: [] };

    if (parts[1]) {
      const jsonParts = parts[1].split("--- SEPARADOR_JSON ---");
      patientInstructions = jsonParts[0] ? jsonParts[0].trim() : "";
      if (jsonParts[1]) {
        try {
          const cleanJson = jsonParts[1].replace(/```json/g, '').replace(/```/g, '').trim();
          actionItems = JSON.parse(cleanJson);
        } catch (e) { console.warn("JSON Fallido"); }
      }
    }
    return { clinicalNote, patientInstructions, actionItems };
  }
}