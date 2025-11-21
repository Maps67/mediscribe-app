import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    // 1. Validación
    if (!API_KEY) throw new Error("Falta la API Key en Netlify.");

    // 2. Configuración Directa (Sin librería)
    // Usamos el modelo flash. Si este falla, cambiaremos la URL a 'gemini-1.0-pro'
    const MODEL = "gemini-1.5-flash"; 
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        
        TU OBJETIVO:
        1. Generar una Nota Clínica SOAP técnica.
        2. Generar Instrucciones claras para el paciente.
        3. EXTRAER "ITEMS DE ACCIÓN" en formato JSON estricto.

        FORMATO DE SALIDA OBLIGATORIO (Usa estos separadores exactos):

        ### Resumen Clínico (${specialty})
        **S:** ...
        **O:** ...
        **A:** ...
        **P:** ...

        --- SEPARADOR_INSTRUCCIONES ---

        Hola! Aquí tienes tus indicaciones:
        ... (Instrucciones para paciente)

        --- SEPARADOR_JSON ---
        
        {
          "next_appointment": "Texto fecha sugerida o null",
          "urgent_referral": false,
          "lab_tests_required": ["Lista", "de", "estudios"]
        }
        
        IMPORTANTE: La parte final debe ser SOLO JSON válido.

        Transcripción:
        "${transcript}"
      `;

      // 3. Petición HTTP Directa (Fetch)
      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      // 4. Manejo de Errores Reales
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error Google API:", errorData);
        throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const fullText = data.candidates[0].content.parts[0].text;

      // 5. Parseo (Igual que antes)
      const parts = fullText.split("--- SEPARADOR_INSTRUCCIONES ---");
      const clinicalNote = parts[0] ? parts[0].trim() : "Error generando nota.";
      
      let patientInstructions = "";
      let actionItems: ActionItems = { next_appointment: null, urgent_referral: false, lab_tests_required: [] };

      if (parts[1]) {
        const jsonParts = parts[1].split("--- SEPARADOR_JSON ---");
        patientInstructions = jsonParts[0] ? jsonParts[0].trim() : "";
        
        if (jsonParts[1]) {
          try {
            const cleanJson = jsonParts[1].replace(/```json/g, '').replace(/```/g, '').trim();
            actionItems = JSON.parse(cleanJson);
          } catch (e) {
            console.warn("JSON inválido de IA.");
          }
        }
      }
      
      return { clinicalNote, patientInstructions, actionItems };
      
    } catch (error: any) {
      console.error("Fallo Crítico:", error);
      throw new Error(`Error de Conexión: ${error.message}`);
    }
  }
}