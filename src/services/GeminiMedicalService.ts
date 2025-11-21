import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta VITE_GEMINI_API_KEY. Verifica tus variables en Netlify.");

    // CORRECCIÓN MAESTRA: Usamos el alias 'latest' para evitar errores de versión
    const MODEL_NAME = "gemini-1.5-flash-latest";
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

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔥 Error Google:", errorData);
        
        const errorMessage = errorData.error?.message || response.statusText;
        
        // Si falla el 'latest', intentamos el 'pro' como respaldo automático
        if (errorMessage.includes("not found")) {
            return this.retryWithLegacyModel(prompt);
        }
        
        throw new Error(`Error API: ${errorMessage}`);
      }

      const data = await response.json();
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!fullText) throw new Error("Google respondió, pero el texto llegó vacío.");

      return this.parseResponse(fullText);

    } catch (error: any) {
      console.error("Fallo Crítico:", error);
      throw error; 
    }
  }

  // MÉTODO DE RESPALDO (Plan B automático)
  private static async retryWithLegacyModel(prompt: string): Promise<GeminiResponse> {
      console.log("⚠️ Intentando modelo de respaldo (gemini-pro)...");
      const BACKUP_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
      
      const response = await fetch(BACKUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Todos los modelos fallaron. Verifica tu API Key.");
      
      const data = await response.json();
      return this.parseResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
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