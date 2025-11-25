import { GeminiResponse, FollowUpMessage } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (Radar de Modelos - Lógica Original Probada)
  async getBestAvailableModel(): Promise<string> {
    try {
      // Intenta usar flash primero por velocidad, si no el pro
      return "gemini-1.5-flash"; 
    } catch (error) {
      return "gemini-pro";
    }
  },

  // 2. RECETA RÁPIDA (Adapta la lógica nueva al motor viejo 'fetch')
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
     try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const prompt = `
        ROL: Asistente Médico Experto en ${specialty}.
        TAREA: Redactar receta formal basada en: "${transcript}"
        
        INSTRUCCIONES CLÍNICAS:
        1. Detecta medicamentos. Si falta dosis/frecuencia, SUGIERE la estándar segura.
        2. Agrega recomendaciones breves de seguridad.
        
        FORMATO (TEXTO PLANO PARA PDF):
        [Medicamento] [Concentración] [Forma]
        Indicación: [Dosis, Frecuencia, Duración]
        
        Notas:
        - [Recomendación breve]
        
        SIN saludos ni datos del doctor.
        `;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("Error de conexión con Google");
        
        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar";
        return text.replace(/#/g, "").replace(/\*\*/g, "").replace(/---/g, "").trim();

     } catch (error) {
        console.error("Error QuickRx:", error);
        throw error;
     }
  },

  // 3. GENERAR NOTA SOAP (Motor Original 'fetch')
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        Analiza: "${transcript}"

        Responde ÚNICAMENTE con este JSON estricto:
        {
          "clinicalNote": "Nota Clínica (SOAP) completa.",
          "patientInstructions": "Instrucciones claras para el paciente.",
          "actionItems": {
            "next_appointment": "Fecha o null",
            "urgent_referral": false,
            "lab_tests_required": []
          }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error en petición a Google");
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("IA vacía");

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson) as GeminiResponse;
    } catch (error) {
      console.error("Error Gemini:", error);
      throw error;
    }
  },

  // 4. CHAT CON CONTEXTO (Motor Original 'fetch')
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  
        const prompt = `
          CONTEXTO MÉDICO:
          ${context}
  
          PREGUNTA DEL MÉDICO:
          "${userMessage}"
  
          Responde breve y profesionalmente.
        `;
  
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
  
        if (!response.ok) throw new Error("Error en Chat");
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";
    } catch (error) {
        console.error("Chat Error:", error);
        throw error;
    }
  }
};