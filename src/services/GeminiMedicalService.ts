// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- DEFINICIONES LOCALES (Para evitar errores de importación) ---
export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: {
    next_appointment: string | null;
    urgent_referral: boolean;
    lab_tests_required: string[];
  };
}

export interface FollowUpMessage {
  day: number;
  message: string;
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (EL RADAR QUE SOLUCIONA EL 404)
  // Pregunta a Google qué modelo está vivo antes de intentar usarlo.
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
          console.warn("Fallo el radar, usando modelo seguro por defecto.");
          return "gemini-pro"; 
      }
      
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) return "gemini-pro";

      // Prioridad 1: Flash (Rápido)
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      // Prioridad 2: Pro (Estándar)
      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      // Prioridad 3: Lo que sea que haya
      return validModels[0].name.replace('models/', '');

    } catch (error) {
      return "gemini-pro";
    }
  },

  // 2. RECETA RÁPIDA (Conectada al Radar)
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    if (!API_KEY) return "ERROR: Falta API KEY.";

    try {
      // Paso 1: Usar el Radar
      const modelName = await this.getBestAvailableModel();
      console.log(`🤖 IA Conectada usando: ${modelName}`);

      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      const prompt = `
        ACTÚA COMO: Asistente Médico experto en ${specialty}.
        TAREA: Redactar receta formal basada en: "${transcript}"
        SALIDA: Texto plano limpio. Sin saludos.
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error(`Error ${response.status} en modelo ${modelName}`);

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar.";
      return text.replace(/\*\*/g, "").replace(/#/g, "").trim();

    } catch (error: any) {
      console.error("Error QuickRx:", error);
      return `Error: ${error.message}`;
    }
  },

  // 3. CONSULTA COMPLETA (Conectada al Radar)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API KEY.");

    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const prompt = `
        ACTÚA COMO: Médico Especialista en ${specialty}.
        ANALIZA: "${transcript}"
        GENERA JSON ESTRICTO:
        {
          "clinicalNote": "Nota SOAP técnica.",
          "patientInstructions": "Indicaciones claras.",
          "actionItems": { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) throw new Error("IA vacía");

      // Limpieza JSON
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(cleanJson);
      } catch (e) {
        // Intento de rescate de JSON si falla el parseo directo
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
      }

    } catch (error: any) {
      console.error("Error SOAP:", error);
      throw error;
    }
  },

  // 4. CHAT (Conectado al Radar)
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `CTX: ${context}. USER: ${userMessage}` }] }] })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (e) { return "Error chat."; }
  }
};