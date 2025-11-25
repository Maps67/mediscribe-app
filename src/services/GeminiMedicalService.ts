import { GeminiResponse } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

export const GeminiMedicalService = {
  
  /**
   * Genera la nota clínica completa (SOAP), indicaciones y receta.
   * Ahora acepta la especialidad para ajustar el contexto médico.
   */
  async generateClinicalNote(transcript: string, specialty: string = 'Medicina General'): Promise<GeminiResponse> {
    const prompt = `
      Actúa como un médico especialista en ${specialty} experto y preciso.
      
      Tarea: Analiza la siguiente transcripción de una consulta médica (dictado o conversación).
      Genera un objeto JSON estricto con la siguiente estructura, sin texto adicional fuera del JSON:
      
      {
        "clinicalNote": "Nota clínica en formato SOAP (Subjetivo, Objetivo, Análisis, Plan). Usa lenguaje técnico médico formal.",
        "patientInstructions": "Indicaciones claras, empáticas y detalladas para el paciente. Incluye medicamentos (nombre, dosis, frecuencia), cuidados generales y signos de alarma.",
        "actionItems": {
            "next_appointment": "Fecha sugerida o null",
            "urgent_referral": boolean,
            "lab_tests_required": ["lista de estudios", "si aplica"]
        }
      }

      Transcripción:
      "${transcript}"
    `;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`Error API: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("La IA no devolvió texto.");

      // Limpieza del JSON (por si la IA añade bloques de código Markdown)
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(jsonString) as GeminiResponse;

    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  },

  /**
   * NUEVO MÉTODO: Genera solo el texto de una receta médica.
   * Usado por el Modal de Receta Rápida (QuickRxModal).
   */
  async generatePrescriptionOnly(transcript: string): Promise<string> {
    const prompt = `
      Actúa como un asistente médico experto.
      
      Tarea: Convierte el siguiente dictado de voz en una Receta Médica formal y clara.
      
      Reglas:
      1. Extrae los medicamentos, dosis, frecuencia y duración.
      2. Formatea como una lista clara.
      3. Corrige nombres de medicamentos si el dictado tiene errores fonéticos leves.
      4. Si hay indicaciones no farmacológicas (dieta, cuidados), agrégalas al final.
      5. NO devuelvas JSON, devuelve TEXTO PLANO listo para imprimir.

      Dictado:
      "${transcript}"
    `;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`Error API: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return text || transcript; // Fallback al texto original si falla
    } catch (error) {
      console.error("Gemini QuickRx Error:", error);
      return transcript; // Fallback seguro
    }
  },

  /**
   * Permite chatear sobre el contexto de la nota generada.
   */
  async chatWithContext(question: string, context: GeminiResponse | null, specialty: string): Promise<string> {
    const contextText = context 
        ? `Contexto Clínico Actual (${specialty}): Nota: ${context.clinicalNote}. Indicaciones: ${context.patientInstructions}.`
        : `Contexto: El médico especialista en ${specialty} está preguntando algo general.`;

    const prompt = `
      ${contextText}
      
      Pregunta del médico: "${question}"
      
      Responde de manera concisa, técnica y útil para la toma de decisiones clínicas.
    `;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar la respuesta.";
    } catch (error) {
      return "Error de conexión con el chat.";
    }
  }
};