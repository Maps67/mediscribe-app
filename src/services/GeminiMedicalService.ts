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

    // --- FILTRO DE CALIDAD 1: LONGITUD ---
    // Si el texto es menor a 15 caracteres, es ruido o prueba de micro.
    if (!transcript || transcript.length < 15) {
        return {
            clinicalNote: "⚠️ ERROR: Audio insuficiente.\n\nNo se detectó suficiente información clínica para generar un expediente.\nPor favor dicte los síntomas, exploración física y diagnóstico.",
            patientInstructions: "No hay instrucciones generadas.",
            actionItems: { next_appointment: null, urgent_referral: false, lab_tests_required: [] }
        };
    }

    const activeModelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty} con enfoque en precisión clínica.
        
        TIENES ACCESO AL HISTORIAL: "${historyContext || 'Sin historial relevante.'}"
        TRANSCRIPCIÓN ACTUAL: "${transcript}"

        TU TAREA ES GENERAR 3 SALIDAS ESTRUCTURADAS:
        
        🚨 IMPORTANTE: SI LA TRANSCRIPCIÓN NO CONTIENE DATOS MÉDICOS REALES (ej. solo dice "hola", "probando", "si te escucho"), DETENTE Y RESPONDE: "⚠️ Audio insuficiente. No se detectaron datos clínicos." EN TODAS LAS SECCIONES. NO INVENTES DATOS.

        1. ### NOTA TÉCNICA (SOAP):
           - Lenguaje médico formal.
           - Incluye evolución si hay historial previo.

        2. ### INDICACIONES AL PACIENTE:
           - OBJETIVO: Instrucciones claras y directas.
           - PROHIBIDO: No saludes, no des explicaciones emocionales.
           - FORMATO: 💊 Esquema Farmacológico, 🥗 Medidas Generales, ⚠️ Signos de Alarma.
           - CIRUGÍA: Si es pre/post operatorio, agrega "CUIDADOS DE HERIDA".

        3. ### ACTION ITEMS (JSON):
           - Extrae datos para automatización.

        --- SEPARADOR_INSTRUCCIONES ---

        [Indicaciones al Paciente]

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

  // Mantenemos la función de Receta Rápida sin cambios, pero protegida
  static async generatePrescriptionOnly(transcript: string): Promise<string> {
    if (!API_KEY) throw new Error("Falta API Key.");
    if (!transcript || transcript.length < 10) return "⚠️ Audio insuficiente. Por favor dicte los medicamentos.";

    const activeModelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Asistente Farmacéutico. Formatea este dictado en una Receta Médica Clara.
        NO INVENTES MEDICAMENTOS. Si no entiendes, di "No reconocible".
        
        DICTADO: "${transcript}"

        SALIDA:
        💊 **Medicamentos:**
        * **[Nombre] [Dosis]:** [Frecuencia]
        
        📋 **Indicaciones:**
        * [Cuidados]
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error Google");
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";

    } catch (error: any) { throw new Error(error.message); }
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