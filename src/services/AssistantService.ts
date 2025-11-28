import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export type AssistantActionType = 'create_appointment' | 'unknown';

export interface AssistantResponse {
  action: AssistantActionType;
  data?: {
    patientName?: string;
    title?: string;
    start_time?: string;
    duration_minutes?: number;
    notes?: string;
  };
  message: string;
}

export const AssistantService = {
  
  // 1. FUNCIÓN RADAR (Copiada de la estrategia exitosa de GeminiService)
  async getBestModel(): Promise<string> {
    try {
      // Intentamos listar los modelos disponibles para tu API Key
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      if (!response.ok) return "gemini-pro"; // Fallback seguro clásico
      
      const data = await response.json();
      const models = data.models || [];

      // Buscamos específicamente Flash porque es rápido para voz
      const flashModel = models.find((m: any) => m.name.includes("flash") && m.supportedGenerationMethods.includes("generateContent"));
      if (flashModel) return flashModel.name.replace('models/', '');

      // Si no hay Flash, buscamos Pro 1.5
      const pro15 = models.find((m: any) => m.name.includes("gemini-1.5-pro"));
      if (pro15) return pro15.name.replace('models/', '');

      // Último recurso
      return "gemini-pro";
    } catch (e) {
      return "gemini-pro";
    }
  },

  async processCommand(transcript: string): Promise<AssistantResponse> {
    if (!API_KEY) throw new Error("Falta API Key de Gemini");

    try {
      // 1. Descubrir el modelo correcto dinámicamente
      const modelName = await this.getBestModel();
      console.log(`🤖 Asistente usando modelo: ${modelName}`);

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName, // Usamos el modelo descubierto, no hardcoded
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const contextDate = now.toLocaleString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: false 
      });

      const prompt = `
        ACTÚA COMO: Asistente personal de una clínica médica.
        FECHA Y HORA ACTUAL: ${contextDate} (ISO Base: ${now.toISOString()})

        TU MISIÓN:
        Analiza el comando de voz y genera un JSON para agendar citas.

        COMANDO: "${transcript}"

        REGLAS DE CÁLCULO DE FECHA:
        - Si dice "mañana", suma 1 día a la fecha actual.
        - Si dice un día de la semana (ej. "el viernes"), calcula la fecha del PRÓXIMO viernes.
        - Si no dice hora, asume 09:00 AM.
        - Formato 'start_time': ISO 8601 (YYYY-MM-DDTHH:mm:ss).

        FORMATO JSON DE SALIDA (SIN MARKDOWN):
        {
          "action": "create_appointment" | "unknown",
          "data": {
            "patientName": "Nombre detectado",
            "title": "Consulta General",
            "start_time": "2025-11-29T16:00:00",
            "duration_minutes": 30,
            "notes": "Detalles extra"
          },
          "message": "Confirmación natural para el doctor."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();
      
      // Limpieza de JSON
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text) as AssistantResponse;
      
      // Validación de seguridad
      if (parsed.action === 'create_appointment' && !parsed.data?.start_time) {
          return {
              action: 'unknown',
              message: "Entendí que quieres una cita, pero no detecté la fecha u hora exacta."
          };
      }

      return parsed;

    } catch (error: any) {
      console.error("Error AssistantService:", error);
      // Fallback amigable si falla la IA
      return {
        action: 'unknown',
        message: "Hubo un problema de conexión con la IA. Intenta escribir la cita manualmente."
      };
    }
  }
};