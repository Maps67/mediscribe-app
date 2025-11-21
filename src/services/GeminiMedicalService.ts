import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    // 1. Verificamos que la llave exista en el código
    if (!API_KEY) throw new Error("Falta VITE_GEMINI_API_KEY. Verifica tus variables en Netlify.");

    // 2. Usamos DIRECTAMENTE el modelo Flash (el estándar actual)
    const MODEL_NAME = "gemini-1.5-flash";
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        Analiza la siguiente transcripción, identifica médico/paciente y genera:
        1. Nota SOAP.
        2. Instrucciones al paciente.
        3. Action Items en JSON.

        FORMATO DE SALIDA (Estricto):
        ### Resumen Clínico (${specialty})
        ... (Nota)
        --- SEPARADOR_INSTRUCCIONES ---
        ... (Instrucciones)
        --- SEPARADOR_JSON ---
        { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }

        Transcripción: "${transcript}"
      `;

      console.log(`📡 Conectando con Google (${MODEL_NAME})...`);

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      // 3. AQUÍ ESTÁ LA CLAVE: Si falla, leemos el mensaje real de Google
      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔥 Error Google:", errorData);
        
        const errorMessage = errorData.error?.message || response.statusText;
        const errorCode = errorData.error?.code || response.status;

        // Traducimos los errores más comunes para ti
        if (errorMessage.includes("API key not valid")) throw new Error("Tu API Key es rechazada. ¿Copiaste la correcta de AI Studio?");
        if (errorMessage.includes("not enabled")) throw new Error("La API no está habilitada en tu cuenta de Google Cloud.");
        if (errorMessage.includes("User location is not supported")) throw new Error("Este modelo no está disponible en tu país/región.");
        
        throw new Error(`Error ${errorCode}: ${errorMessage}`);
      }

      const data = await response.json();
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!fullText) throw new Error("Google respondió, pero el texto llegó vacío.");

      return this.parseResponse(fullText);

    } catch (error: any) {
      console.error("Fallo Crítico:", error);
      throw error; // Lanzamos el error tal cual para verlo en la alerta
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