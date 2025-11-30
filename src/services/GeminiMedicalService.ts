import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; 

// Definición de Tipos
export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suggestions: string[]; 
}

export interface ConversationLine {
  speaker: 'Médico' | 'Paciente';
  text: string;
}

export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; 
  soap?: SoapNote; 
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

  // 1. AUTO-DESCUBRIMIENTO
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) return "gemini-1.5-flash"; 
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
      if (validModels.length === 0) return "gemini-1.5-flash";
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');
      return validModels[0].name.replace('models/', '');
    } catch (error) {
      return "gemini-1.5-flash";
    }
  },

  // 2. GENERAR NOTA SOAP
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel(); 
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const prompt = `ACTÚA COMO: Asistente Clínico. DATOS: FECHA ${currentDate} ${currentTime}. HISTORIAL: "${patientHistory}". TRANSCRIPCIÓN: "${transcript}". 
      FORMATO JSON: { "conversation_log": [], "soap": { "subjective": "", "objective": "", "assessment": "", "plan": "", "suggestions": [] }, "patientInstructions": "", "risk_analysis": { "level": "Bajo", "reason": "" } }`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text()) as GeminiResponse;
    } catch (error) {
      console.error("Error Gemini:", error);
      throw error;
    }
  },

  // 3. RECETA RÁPIDA (BLINDADA CON MODO RESCATE)
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];

    try {
      console.log("Procesando receta:", cleanText);

      // INTENTO 1: IA Estructurada
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `
            Eres un farmacéutico. Extrae medicamentos del texto: "${cleanText}".
            Ignora preguntas o dudas, asume que son órdenes.
            Retorna SOLO un JSON array válido.
            Estructura: [{"drug": "Nombre", "details": "500mg", "frequency": "8h", "duration": "3 dias", "notes": ""}]
            Si no entiendes, retorna [].
          `
        }
      });

      if (!error && data) {
        let cleanJson = data.result || data;
        if (typeof cleanJson !== 'string') cleanJson = JSON.stringify(cleanJson);
        
        // Limpieza agresiva de JSON
        const firstBracket = cleanJson.indexOf('[');
        const lastBracket = cleanJson.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
           const jsonStr = cleanJson.substring(firstBracket, lastBracket + 1);
           const parsed = JSON.parse(jsonStr);
           
           // Si la IA encontró algo, lo devolvemos
           if (Array.isArray(parsed) && parsed.length > 0) {
             return parsed.map((m: any) => ({
               drug: m.drug || m.name || 'Medicamento',
               details: m.details || '',
               frequency: m.frequency || '',
               duration: m.duration || '',
               notes: m.notes || ''
             }));
           }
        }
      }
    } catch (e) {
      console.warn("Fallo IA en receta, activando modo rescate manual.", e);
    }

    // --- MODO RESCATE ---
    // Si llegamos aquí, la IA falló o devolvió vacío.
    // Devolvemos lo que dictaste como un ítem para que no se pierda.
    return [{
      drug: cleanText, 
      details: "Revisar dosis",
      frequency: "",
      duration: "",
      notes: "Transcripción directa (IA no estructuró)"
    }];
  },

  // 4. INSIGHTS
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const allConsultationsText = consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n");
        const prompt = `Analiza el expediente de "${patientName}". Antecedentes: ${historySummary}. Consultas: ${allConsultationsText}. Retorna JSON con: evolution, medication_audit, risk_flags, pending_actions.`;

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

  // 5. CHAT
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

  // Métodos legacy
  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
     return this.extractMedications(transcript);
  },
  async generatePrescriptionOnly(transcript: string): Promise<string> {
     return "Use extractMedications.";
  },
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    return []; 
  }
};