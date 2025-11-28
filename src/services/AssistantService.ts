import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Definición de las acciones que el asistente puede entender
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
  
  async processCommand(transcript: string): Promise<AssistantResponse> {
    if (!API_KEY) throw new Error("Falta API Key de Gemini");

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      // Formato local completo para que la IA entienda "mañana", "el viernes", etc.
      const contextDate = now.toLocaleString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: false 
      });

      const prompt = `
        ACTÚA COMO: Asistente personal de una clínica médica.
        FECHA Y HORA ACTUAL: ${contextDate} (ISO Base para cálculos: ${now.toISOString()})

        TU MISIÓN:
        Analiza el comando de voz y genera un JSON para agendar citas.

        COMANDO: "${transcript}"

        REGLAS DE CÁLCULO DE FECHA:
        - Si dice "mañana", suma 1 día a la fecha actual.
        - Si dice un día de la semana (ej. "el viernes"), calcula la fecha del PRÓXIMO viernes.
        - Si no dice hora, usa 09:00:00.
        - Formato de salida para 'start_time': ISO 8601 (YYYY-MM-DDTHH:mm:ss).

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
      
      console.log("🤖 Respuesta Cruda IA:", text); // Para depuración

      // --- LAVADO DE JSON (FIX CRÍTICO) ---
      // 1. Eliminar bloques de código markdown ```json ... ```
      text = text.replace(/```json/g, '').replace(/```/g, '');
      // 2. Eliminar posibles espacios en blanco al inicio/final
      text = text.trim();

      // 3. Intentar parsear
      const parsed = JSON.parse(text) as AssistantResponse;
      
      // Validación extra: Si la IA alucina y no manda datos mínimos
      if (parsed.action === 'create_appointment' && !parsed.data?.start_time) {
          console.warn("IA devolvió acción sin fecha válida");
          return {
              action: 'unknown',
              message: "Entendí que quieres una cita, pero no detecté la fecha u hora. ¿Podrías repetir?"
          };
      }

      return parsed;

    } catch (error: any) {
      console.error("Error AssistantService:", error);
      return {
        action: 'unknown',
        message: `No pude procesar la solicitud. (${error.message || 'Error interno'})`
      };
    }
  }
};