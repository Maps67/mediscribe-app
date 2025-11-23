import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // --- 1. EL RADAR (Auto-Descubrimiento) ---
  // Esta función pregunta a Google: "¿Qué modelos tengo disponibles hoy?"
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) throw new Error("Error validando API Key al listar modelos");
      
      const data = await response.json();
      
      // Filtramos solo los modelos que sirven para generar texto
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) {
        throw new Error("No hay modelos disponibles para esta cuenta.");
      }

      // Lógica de Prioridad: 1. Flash -> 2. Pro -> 3. Cualquiera
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) {
        console.log("Modelo seleccionado: FLASH ⚡");
        return flashModel.name.replace('models/', '');
      }

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) {
        console.log("Modelo seleccionado: PRO 🛡️");
        return proModel.name.replace('models/', '');
      }

      // Fallback final
      console.log("Modelo seleccionado: GENÉRICO 🎲");
      return validModels[0].name.replace('models/', '');

    } catch (error) {
      console.warn("Fallo en auto-descubrimiento, usando default seguro.");
      return "gemini-pro"; // Último recurso si todo falla
    }
  },

  // --- 2. GENERACIÓN DE NOTA (Usando el modelo descubierto) ---
  async generateClinicalNote(transcript: string): Promise<GeminiResponse> {
    try {
      // Paso A: Obtener el modelo correcto dinámicamente
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const prompt = `
        Actúa como un médico experto. Transforma el siguiente dictado en un JSON estricto.
        
        DICTADO: "${transcript}"

        Responde ÚNICAMENTE con este JSON (sin markdown):
        {
          "clinicalNote": "Nota clínica completa formato SOAP.",
          "patientInstructions": "Instrucciones claras para el paciente (medicamentos y cuidados).",
          "actionItems": {
            "next_appointment": "Fecha sugerida o null",
            "urgent_referral": false,
            "lab_tests_required": []
          }
        }
      `;

      // Paso B: Hacer la petición
      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Error ${response.status}: ${err.error?.message}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("La IA no generó texto.");

      // Paso C: Limpieza y Parseo
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson) as GeminiResponse;

    } catch (error) {
      console.error("Error en Gemini Service:", error);
      throw error;
    }
  },

  // --- 3. RECETA RÁPIDA ---
  async generatePrescriptionOnly(transcript: string): Promise<string> {
    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const prompt = `
        Actúa como médico. Basado en este dictado: "${transcript}", genera SOLO el texto de una receta médica.
        Incluye medicamentos, dosis y frecuencia. Formato texto plano.
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error("Error generando receta");

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar texto.";

    } catch (error) {
      console.error("Error receta:", error);
      throw error;
    }
  }
};