// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- DEFINICIONES LOCALES (Para no depender de archivos externos rotos) ---
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

// --- FUNCIÓN DE LIMPIEZA DE JSON (Anti-Errores) ---
const cleanAndParseJSON = (rawText: string): any => {
  try {
    return JSON.parse(rawText);
  } catch (e) {
    // Si falla, intentamos extraer solo el bloque JSON usando Regex
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("Fallo limpieza JSON:", rawText);
        throw new Error("La IA devolvió un formato inválido.");
      }
    }
    throw new Error("No se encontró JSON válido en la respuesta.");
  }
};

export const GeminiMedicalService = {

  // 1. RECETA RÁPIDA (Fetch Nativo - Indestructible)
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    if (!API_KEY) return "ERROR CRÍTICO: Falta API Key en .env";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `ERES UN EXPERTO EN ${specialty}. REDACTA UNA RECETA MÉDICA FORMAL.
                DICTADO: "${transcript}"
                SALIDA: Solo texto plano con medicamentos y dosis. Sin saludos.`
              }]
            }]
          })
        }
      );

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error en generación.";
      
      return text.replace(/\*\*/g, "").replace(/#/g, "").trim();

    } catch (error: any) {
      console.error("QuickRx Error:", error);
      return `Error: ${error.message}`;
    }
  },

  // 2. CONSULTA COMPLETA (SOAP)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta configuración de API Key.");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `
                  ACTÚA COMO MÉDICO ESPECIALISTA EN ${specialty}.
                  ANALIZA ESTE DICTADO: "${transcript}"
                  
                  TU MISIÓN: Generar un objeto JSON válido.
                  FORMATO ESTRICTO:
                  {
                    "clinicalNote": "Nota SOAP detallada",
                    "patientInstructions": "Lista de indicaciones",
                    "actionItems": {
                      "next_appointment": null,
                      "urgent_referral": false,
                      "lab_tests_required": []
                    }
                  }
                `
              }]
            }]
          })
        }
      );

      if (!response.ok) throw new Error(`Google API Error: ${response.status}`);

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("Respuesta vacía de la IA");

      // Usamos el limpiador blindado
      return cleanAndParseJSON(rawText);

    } catch (error: any) {
      console.error("🔥 Error en Servicio IA:", error);
      throw error;
    }
  },

  // 3. CHAT
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    if (!API_KEY) return "Error: Sin API Key";
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Contexto: ${context}. Pregunta: ${userMessage}` }] }]
          })
        }
      );
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
    } catch (e) { return "Error de conexión"; }
  }
};