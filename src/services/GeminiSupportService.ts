import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🚀 SUPPORT ENGINE: Online (Gemini 2.5 Flash)");

// ✅ NO pegues tu llave aquí. Esta línea la lee automáticamente de Netlify.
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";
const MODEL_NAME = "gemini-2.5-flash";

// 📘 EL CEREBRO DEL ASISTENTE (MANUAL DE USUARIO)
// Puedes editar este texto cuando quieras cambiar las respuestas del soporte.
const APP_MANUAL = `
  NOMBRE APP: MediScribe-PRO (Asistente Médico IA).
  
  RESUMEN:
  Asistente inteligente diseñado para médicos que automatiza la documentación clínica.
  
  GUÍA DE USO RÁPIDA (BOTONES):
  1. "Grabar" (Micrófono): Presiona una vez para empezar a escuchar la consulta.
  2. "Generar Nota" (Varita Mágica): Envía el audio procesado a la IA. Espera unos segundos a que redacte.
  3. "Validar y Guardar" (Disco): Guarda la nota en la base de datos, genera el PDF y la receta. Bloquea edición.
  
  CAMPOS IMPORTANTES:
  - "Historial del Paciente": Campo de texto superior. Si pegas aquí antecedentes (ej: 'Alérgico a Penicilina'), la IA activará alertas de seguridad automáticamente.
  
  PREGUNTAS FRECUENTES (FAQ):
  - "¿La IA se equivoca?": Sí, es un asistente probabilístico. El médico TIENE que leer y validar antes de guardar.
  - "¿Qué significa Riesgo Alto?": Que la IA detectó síntomas graves (ej: infarto) o una contradicción en el tratamiento (ej: dar azúcar a un diabético).
  - "¿Se guarda el audio?": NO. Por privacidad y seguridad (HIPAA), el audio se elimina apenas se transcribe.
  
  SOLUCIÓN DE PROBLEMAS:
  - Si da error, verifica tu conexión a internet y refresca la página.
`;

export const GeminiSupportService = {
  
  async askSupport(userQuestion: string): Promise<string> {
    // Verificación de seguridad
    if (!API_KEY) {
      console.error("❌ Error: Falta API Key en el servicio de soporte.");
      return "Error de configuración: No puedo conectar con el servidor de ayuda.";
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });

      const prompt = `
        ERES: Agente de Soporte Técnico experto de la app MediScribe-PRO.
        TU CONOCIMIENTO (MANUAL): "${APP_MANUAL}"
        
        PREGUNTA DEL USUARIO: "${userQuestion}"
        
        INSTRUCCIONES:
        1. Tu objetivo es explicar CÓMO USAR LA APP basándote en el MANUAL.
        2. Sé breve, amable y directo (máximo 2 párrafos).
        3. Si la pregunta es MÉDICA (ej: "¿Qué dosis receto?"), responde: "Soy el asistente técnico. Para asistencia clínica, por favor usa el botón 'Generar Nota'."
        4. Si no sabes la respuesta, di: "Esa función no está en mi manual, contacte a soporte humano."
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return response || "Lo siento, no tengo respuesta para eso en mi manual.";

    } catch (error) {
      console.error("Error en Gemini Support:", error);
      return "El asistente de ayuda está dormido. Intenta de nuevo en un momento.";
    }
  }
};