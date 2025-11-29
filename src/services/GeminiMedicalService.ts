import { GoogleGenerativeAI } from "@google/generative-ai";

// Definición de Tipos (Extendida para soportar Diarización y Sugerencias)
export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suggestions: string[]; // Aquí irán las recomendaciones de "Completitud Diagnóstica"
}

export interface ConversationLine {
  speaker: 'Médico' | 'Paciente';
  text: string;
}

export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; // Legacy support
  soap?: SoapNote;       // Estructura nueva
  risk_analysis?: { level: 'Bajo' | 'Medio' | 'Alto', reason: string };
  patientInstructions?: string;
  actionItems?: any;
}

export interface MedicationItem {
  drug: string;
  details: string;
  frequency: string;
  duration: string;
  notes: string;
}

export interface FollowUpMessage {
  day: number;
  message: string;
}

export interface PatientInsight {
  evolution: string;
  medication_audit: string;
  risk_flags: string[];
  pending_actions: string[];
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (PROTOCOLO RADAR) - INTACTO
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
          console.warn("Fallo listado de modelos, usando fallback seguro.");
          return "gemini-1.5-flash"; 
      }
      
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) return "gemini-1.5-flash";

      // Prioridad: Flash -> Pro -> Cualquiera
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      return validModels[0].name.replace('models/', '');
    } catch (error) {
      return "gemini-1.5-flash";
    }
  },

  // 2. GENERAR NOTA SOAP CON LÓGICA DE PRECISIÓN CLÍNICA (V3.2 SAFE-MODE)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel(); 
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      // --- PROMPT MAESTRO REFINADO (Versión CTO) ---
      const prompt = `
        ACTÚA COMO: Un Asistente Clínico Senior experto en terminología médica, validación de expedientes y NOM-004, especializado en ${specialty.toUpperCase()}.
        
        TU MISIÓN CRÍTICA ES LA PRECISIÓN Y LA SEGURIDAD DEL PACIENTE.

        1. PROTOCOLO DE DIARIZACIÓN:
           - Analiza el texto y separa quién habla (Médico vs Paciente) por el contexto.

        2. PROTOCOLO DE CORRECCIÓN FONÉTICA (Anti-Alucinación):
           - Corrige errores de transcripción (ASR) basándote en el contexto clínico.
           - REGLAS DE ORO:
             * "Golpe S3" -> Corregir a "Ritmo de Galope (S3)".
             * "Fase libre" -> Corregir a "Fase IIb" (si es ensayo clínico) o "Fracción libre" (si es laboratorio).
             * CASO "B20" vs "HAM-A": Si escuchas "B20", verifica si hay contexto de infección/inmunología. Si lo hay, MANTÉN "B20" (CIE-10 VIH). Solo cámbialo a "HAM-A" si el contexto es puramente psiquiátrico/ansiedad.

        3. PROTOCOLO DE COMPLETITUD (Asistencia, no Suplantación):
           - Si detectas patologías crónicas (Diabetes, Hipertensión, Insuficiencia Cardíaca) y el médico NO mencionó los marcadores Gold Standard (ej. HbA1c, Pro-BNP), NO los inventes en el Plan.
           - ACCIÓN: Agrégalos EXCLUSIVAMENTE en el campo "suggestions".

        DATOS DE ENTRADA:
        - FECHA: ${currentDate} ${currentTime}
        - HISTORIAL PREVIO: "${patientHistory || 'Sin historial.'}"
        - TRANSCRIPCIÓN CRUDA: "${transcript}"

        FORMATO JSON ESTRICTO DE SALIDA:
        {
          "conversation_log": [
             { "speaker": "Médico", "text": "Ejemplo: ¿Desde cuándo le duele?" },
             { "speaker": "Paciente", "text": "Ejemplo: Desde ayer, doctor." }
          ],
          "soap": {
            "subjective": "Resumen narrativo (S). Aplica corrección fonética aquí.",
            "objective": "Signos vitales y hallazgos físicos (O). Corrige 'Golpe S3' aquí.",
            "assessment": "Diagnóstico o impresión clínica (A).",
            "plan": "Plan de tratamiento y estudios REALES dictados por el médico (P).",
            "suggestions": ["Sugerencia 1: Solicitar HbA1c (Diabetes detectada)", "Sugerencia 2: Verificar escala HAM-A"]
          },
          "patientInstructions": "Instrucciones claras para el paciente en lenguaje sencillo...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación breve del riesgo."
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const parsedData = JSON.parse(text);
      
      return parsedData as GeminiResponse;

    } catch (error) {
      console.error("Error Gemini V3.2:", error);
      throw error;
    }
  },

  // 3. GENERAR BALANCE CLÍNICO (INSIGHTS) - INTACTO
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

        const allConsultationsText = consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n");

        const prompt = `
            ACTÚA COMO: Consultor Clínico Senior y Auditor Médico.
            OBJETIVO: Analizar el expediente completo del paciente "${patientName}" y generar un "Balance Clínico 360".
            
            DATOS DE ENTRADA:
            1. Antecedentes: ${historySummary}
            2. Historial de Consultas:
            ${allConsultationsText}

            FORMATO JSON ESTRICTO DE SALIDA:
            {
                "evolution": "Resumen narrativo de la evolución de salud...",
                "medication_audit": "Análisis de medicamentos (eficacia, cambios)...",
                "risk_flags": ["Riesgo 1", "Riesgo 2"],
                "pending_actions": ["Pendiente 1", "Pendiente 2"]
            }
        `;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("Error generando Insights");
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(cleanJsonText) as PatientInsight;

      } catch (e) {
          console.error("Error Insights:", e);
          throw e;
      }
  },

  // 4. PLAN DE SEGUIMIENTO (CHAT) - INTACTO
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (e) { return "Error chat"; }
  },

  // 5. RECETA RÁPIDA (JSON + REGEX FIX) - INTACTO
  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
    try {
       const modelName = await this.getBestAvailableModel();
       const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
       const prompt = `Extraer medicamentos JSON de: "${transcript}" para "${patientName}". FORMATO: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}]. SOLO JSON.`;
       const response = await fetch(URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
       });
       if (!response.ok) return [];
       const data = await response.json();
       const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
       
       let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
       const firstBracket = cleanText.indexOf('[');
       const lastBracket = cleanText.lastIndexOf(']');
       if (firstBracket !== -1 && lastBracket !== -1) cleanText = cleanText.substring(firstBracket, lastBracket + 1);
       
       return JSON.parse(cleanText);
    } catch (e) { return []; }
  },

  // 6. RECETA TEXTO PLANO (LEGACY) - INTACTO
  async generatePrescriptionOnly(transcript: string): Promise<string> {
     try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `Genera receta médica texto plano para: "${transcript}". Solo la receta.`;
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
     } catch (e) { throw e; }
  },

  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    return []; 
  }
};