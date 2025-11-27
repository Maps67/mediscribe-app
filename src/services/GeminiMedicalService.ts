import { GeminiResponse, FollowUpMessage, MedicationItem } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

// INTERFAZ INTERNA PARA ESTRUCTURA SOAP
interface SOAPStructure {
    headers: {
        date: string;
        time: string;
        patientName?: string;
        patientAge?: string;
        patientGender?: string;
    };
    subjective: string;
    objective: string;
    analysis: string;
    plan: string;
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (PROTOCOLO RADAR REACTIVADO 📡)
  // Este bloque busca qué modelos tienes disponibles para evitar el Error 404
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
          console.warn("Fallo listado de modelos, usando fallback seguro.");
          return "gemini-pro"; 
      }
      
      const data = await response.json();
      
      // Filtramos modelos que sirvan para generar texto
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) return "gemini-pro";

      // Prioridad 1: Flash (Rápido)
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      // Prioridad 2: Pro (Estándar)
      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      // Fallback: El primero que encuentre
      return validModels[0].name.replace('models/', '');
    } catch (error) {
      console.warn("Error en Radar, usando gemini-pro por defecto.");
      return "gemini-pro";
    }
  },

  // 2. GENERAR NOTA SOAP ESTRUCTURADA (MOTOR V4)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      // AQUI USAMOS EL RADAR PARA OBTENER EL MODELO CORRECTO
      const modelName = await this.getBestAvailableModel(); 
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      // OBTENER FECHA Y HORA
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const prompt = `
        ACTÚA COMO: Un Médico Escribano de Élite y Auditor Clínico, especializado en ${specialty.toUpperCase()}.
        TU OBJETIVO: Analizar el dictado y generar una Nota Clínica SOAP ESTRUCTURADA y PROFESIONAL.

        DATOS DE ENTRADA:
        - FECHA REAL: ${currentDate}
        - HORA REAL: ${currentTime}
        - HISTORIAL PREVIO: "${patientHistory || 'Sin historial.'}"
        - DICTADO ACTUAL: "${transcript}"

        REGLAS DE ORO:
        1.  **PROFESIONALISMO:** Terminología médica precisa.
        2.  **DYNAMIC SCRIBE (VERDAD):** NO inventes signos vitales. Si no se dictan, omítelos.
        3.  **INTEGRACIÓN:** Usa el historial si existe.
        4.  **LIMPIEZA:** Texto plano dentro de cada sección JSON.

        FORMATO DE SALIDA (JSON ESTRICTO):
        {
          "soapData": {
            "headers": {
                "date": "${currentDate}",
                "time": "${currentTime}",
                "patientName": "Extraer o null",
                "patientAge": "Extraer o null",
                "patientGender": "Extraer o null"
            },
            "subjective": "Texto del Padecimiento Actual...",
            "objective": "Hallazgos físicos reales...",
            "analysis": "Razonamiento clínico...",
            "plan": "Tratamiento y seguimiento..."
          },
          "patientInstructions": "Instrucciones para el paciente.",
          "actionItems": {
             "next_appointment": "YYYY-MM-DD" o null,
             "urgent_referral": boolean,
             "lab_tests_required": []
          }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Google API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      // Limpieza y Parseo
      const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsedData;
      
      try {
          parsedData = JSON.parse(cleanJsonText);
      } catch (e) {
          // Fallback si la IA falla el JSON: Devolver texto plano en estructura compatible
          console.error("Fallo parseo JSON V4", e);
          return {
              clinicalNote: text, // Texto crudo
              patientInstructions: "Revisar nota completa.",
              actionItems: { next_appointment: null, urgent_referral: false, lab_tests_required: [] }
          };
      }

      // Adaptador de respuesta
      return {
          ...parsedData,
          // Respaldo de texto plano
          clinicalNote: parsedData.soapData ? 
            `FECHA: ${parsedData.soapData.headers.date}\nS: ${parsedData.soapData.subjective}\nO: ${parsedData.soapData.objective}\nA: ${parsedData.soapData.analysis}\nP: ${parsedData.soapData.plan}` 
            : text
      } as GeminiResponse;

    } catch (error) {
      console.error("Error en Servicio Médico:", error);
      throw error;
    }
  },

  // --- OTRAS FUNCIONES (CHAT, RECETAS) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    return []; 
  },

  async generatePrescriptionOnly(transcript: string): Promise<string> {
     try {
        const modelName = await this.getBestAvailableModel(); // Usa Radar
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

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel(); // Usa Radar
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE:`;
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error("Error Chat");
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (error) { throw error; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
    try {
       const modelName = await this.getBestAvailableModel(); // Usa Radar
       const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
       const prompt = `Extraer medicamentos JSON de: "${transcript}" para "${patientName}". Formato: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}].`;
       const response = await fetch(URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
       });
       if (!response.ok) return [];
       const data = await response.json();
       const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
       const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
       return JSON.parse(cleanJson);
    } catch (e) { return []; }
 }
};