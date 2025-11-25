import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. OBTENCIÓN SEGURA DE LA CLAVE
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let model: any = null;

// 2. INICIALIZACIÓN CONDICIONAL (Evita pantalla blanca si falta la key)
if (API_KEY) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
        console.error("Error fatal al iniciar Gemini:", error);
    }
} else {
    console.error("🚨 CRÍTICO: No se encontró VITE_GEMINI_API_KEY en el archivo .env");
}

// --- INTERFACES ---
interface ConsultationResponse {
  soapNote: string;
  prescription: string;
  recommendations: string;
}

export const GeminiMedicalService = {
  
  /**
   * Módulo 1: RECETA RÁPIDA (QuickRx)
   * Especializado en completar dosis y formatear para PDF.
   */
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    // Verificaciones de Seguridad
    if (!API_KEY) return "ERROR DE SISTEMA: Falta configurar la API KEY en el archivo .env. Contacte a soporte.";
    if (!model) return "ERROR DE CONEXIÓN: El modelo de IA no está disponible. Verifique su internet.";

    try {
        const prompt = `
        ROL: Eres un Asistente Médico Experto en ${specialty}.
        TAREA: Redactar una receta médica formal basada en este dictado: "${transcript}"
        
        INSTRUCCIONES CLÍNICAS (PROACTIVAS):
        1. Identifica los medicamentos. Si el doctor omitió la dosis o frecuencia, SUGIERE la posología estándar segura.
        2. Agrega recomendaciones breves de seguridad (ej: "Tomar con alimentos", "Hidratación").
        
        REGLAS DE FORMATO (PARA PDF):
        - NO saludes ni te despidas.
        - NO inventes nombre de doctor, fecha ni firma (ya existen en el papel).
        - NO uses Markdown de títulos (#).
        
        SALIDA ESPERADA:
        [Nombre Medicamento] [Concentración] [Forma]
        Indicación: [Dosis, Frecuencia, Duración]
        
        Notas:
        - [Recomendación 1]
        - [Recomendación 2]
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Limpieza final
        text = text.replace(/#/g, "").replace(/\*\*/g, "").replace(/---/g, ""); 
        return text.trim();

    } catch (error: any) {
        console.error("❌ Error en QuickRx:", error);
        return `ERROR AL PROCESAR: ${error.message || "Intente dictar nuevamente."}`;
    }
  },

  /**
   * Módulo 2: CONSULTA COMPLETA (SOAP)
   * Genera el expediente completo.
   */
  async generateConsultationNote(transcript: string, specialty: string): Promise<ConsultationResponse> {
    // Verificaciones de Seguridad
    if (!API_KEY) {
        return {
            soapNote: "ERROR CRÍTICO: Falta API Key.",
            prescription: "No se puede generar receta sin API Key.",
            recommendations: "Verifique archivo .env"
        };
    }

    try {
      const prompt = `
        Experto en ${specialty}. Analiza este audio transcrito: "${transcript}"

        Genera un JSON ESTRICTO con esta estructura:
        {
          "soapNote": "Nota clínica SOAP completa y formal.",
          "prescription": "Listado de medicamentos con dosis corregidas y claras.",
          "recommendations": "Recomendaciones no farmacológicas (dieta, alarmas, cuidados)."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();

      // Limpieza agresiva para evitar errores de JSON
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      return JSON.parse(text);

    } catch (error: any) {
      console.error("❌ Error en FullConsult:", error);
      return {
        soapNote: `Error al generar la nota: ${error.message}`,
        prescription: "Intente generar la receta manualmente o verifique su conexión.",
        recommendations: "No disponibles."
      };
    }
  }
};