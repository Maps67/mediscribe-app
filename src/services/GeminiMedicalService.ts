import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  // LISTA DE MODELOS A PROBAR (En orden de preferencia)
  // Si el primero falla (404), el código saltará automáticamente al siguiente.
  private static MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.0-pro",
    "gemini-pro"
  ];

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta la API Key en Netlify.");

    // Prompt (Instrucciones)
    const prompt = `
      Actúa como un Médico Especialista en ${specialty}.
      TU OBJETIVO: Generar Nota Clínica SOAP, Instrucciones al Paciente y Action Items JSON.

      FORMATO DE SALIDA OBLIGATORIO:
      ### Resumen Clínico (${specialty})
      **S:** ...
      **O:** ...
      **A:** ...
      **P:** ...

      --- SEPARADOR_INSTRUCCIONES ---

      Hola! Aquí tienes tus indicaciones:
      ... (Instrucciones claras)

      --- SEPARADOR_JSON ---
      
      {
        "next_appointment": "Texto fecha o null",
        "urgent_referral": false,
        "lab_tests_required": ["Lista", "de", "estudios"]
      }
      
      Transcripción: "${transcript}"
    `;

    let lastError = null;

    // --- BUCLE DE INTENTOS (La Solución Maestra) ---
    for (const modelName of this.MODELS) {
      try {
        console.log(`🔄 Intentando conectar con modelo: ${modelName}...`);
        
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
          const errData = await response.json();
          // Si es un error 404 (No encontrado), lanzamos error para que el bucle pruebe el siguiente
          throw new Error(errData.error?.message || response.statusText);
        }

        // ¡ÉXITO! Si llegamos aquí, el modelo funcionó. Procesamos y salimos.
        const data = await response.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!fullText) throw new Error("La IA respondió vacía.");

        return this.parseResponse(fullText);

      } catch (error: any) {
        console.warn(`⚠️ Falló modelo ${modelName}:`, error.message);
        lastError = error;
        // Continuamos al siguiente modelo del array...
      }
    }

    // Si todos fallaron
    throw new Error(`Todos los modelos fallaron. Último error: ${lastError.message}`);
  }

  // Función auxiliar para limpiar el código principal
  private static parseResponse(fullText: string): GeminiResponse {
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
          console.warn("JSON inválido, usando defaults.");
        }
      }
    }
    return { clinicalNote, patientInstructions, actionItems };
  }
}