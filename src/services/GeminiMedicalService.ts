// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- TIPOS ---
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: {
    next_appointment: string | null;
    urgent_referral: boolean;
    lab_tests_required: string[];
  };
}

export interface MedicationItem {
  drug: string;      // Nombre (ej. Paracetamol)
  details: string;   // Concentración (ej. 500mg)
  frequency: string; // Frecuencia (ej. Cada 8 horas)
  duration: string;  // Duración (ej. Por 3 días)
  notes: string;     // Notas (ej. Con alimentos)
}

// --- UTILIDADES PRIVADAS ---

const sanitizeInput = (input: string): string => {
  const dangerousPatterns = [
    /ignore previous instructions/gi,
    /system override/gi,
    /act as a developer/gi,
    /delete database/gi
  ];
  let clean = input;
  dangerousPatterns.forEach(pattern => {
    clean = clean.replace(pattern, "[BLOQUEADO]");
  });
  return clean.trim();
};

const extractJSON = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); // Soporta Arrays [] y Objetos {}
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error("JSON malformado");
      }
    }
    throw new Error("La IA no devolvió un formato JSON válido.");
  }
};

// --- SERVICIO PRINCIPAL ---

export const GeminiMedicalService = {

  async getBestAvailableModel(): Promise<string> {
    if (!API_KEY) return "gemini-pro";
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) return "gemini-1.5-flash"; 
      
      const data = await response.json();
      const models = data.models || [];
      
      const flash = models.find((m: any) => m.name.includes("flash") && m.supportedGenerationMethods?.includes("generateContent"));
      if (flash) return flash.name.replace('models/', '');

      return "gemini-pro";
    } catch {
      return "gemini-pro";
    }
  },

  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("API Key no configurada.");
    
    const modelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini Error ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error("Respuesta vacía de Gemini.");
    return text;
  },

  // --- NUEVO MÉTODO: RECETA ESTRUCTURADA (JSON) ---
  async generateQuickRxJSON(transcript: string): Promise<MedicationItem[]> {
    const cleanTranscript = sanitizeInput(transcript);
    
    const prompt = `
      ROL: Médico experto.
      TAREA: Extraer medicamentos y sus indicaciones del siguiente dictado para crear una receta formal.
      DICTADO: "${cleanTranscript}"
      
      SALIDA OBLIGATORIA: Un Array JSON con esta estructura exacta para cada medicamento detectado:
      [
        {
          "drug": "Nombre del medicamento (Genérico/Comercial)",
          "details": "Presentación y Concentración (ej. Tabs 500mg)",
          "frequency": "Indicación de toma (ej. 1 cada 8 horas)",
          "duration": "Duración del tratamiento (ej. 5 días)",
          "notes": "Indicaciones extra (ej. Tomar con alimentos)"
        }
      ]
      
      IMPORTANTE:
      - Si el dictado no es claro, infiere lo más lógico médicamente.
      - NO agregues texto fuera del JSON.
    `;

    try {
      const jsonString = await this.callGeminiAPI({
        contents: [{ parts: [{ text: prompt }] }]
      });
      return extractJSON(jsonString);
    } catch (error) {
      console.error("Error QuickRx JSON:", error);
      return []; 
    }
  },

  // Mantenemos el método antiguo por compatibilidad (opcional)
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    // ... lógica anterior o deprecated
    return "Use generateQuickRxJSON para mejores resultados.";
  },

  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    const cleanTranscript = sanitizeInput(transcript);

    const prompt = `
      ACTÚA COMO: Médico Especialista en ${specialty}.
      ANALIZA EL SIGUIENTE DICTADO: "${cleanTranscript}"
      
      GENERA UN ÚNICO OBJETO JSON:
      {
        "clinicalNote": "Nota SOAP técnica detallada.",
        "patientInstructions": "Indicaciones claras para el paciente.",
        "actionItems": { 
            "next_appointment": "YYYY-MM-DD" o null, 
            "urgent_referral": boolean, 
            "lab_tests_required": [] 
        }
      }
    `;

    try {
      const rawText = await this.callGeminiAPI({
        contents: [{ parts: [{ text: prompt }] }]
      });
      return extractJSON(rawText);
    } catch (error) {
      console.error("Error SOAP:", error);
      throw error;
    }
  },

  async chatWithContext(systemContext: string, history: ChatMessage[], userMessage: string): Promise<string> {
    const cleanUserMsg = sanitizeInput(userMessage);
    
    const contextMessage = {
      role: 'user',
      parts: [{ text: `INSTRUCCIÓN DE SISTEMA: ${systemContext}\nResponde siempre como asistente médico conciso.` }]
    };

    const modelAcknowledge = {
      role: 'model',
      parts: [{ text: "Entendido." }]
    };

    const historyParts = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const currentMessage = {
      role: 'user',
      parts: [{ text: cleanUserMsg }]
    };

    const contents = history.length === 0 
      ? [contextMessage, modelAcknowledge, currentMessage]
      : [contextMessage, modelAcknowledge, ...historyParts, currentMessage];

    try {
      return await this.callGeminiAPI({ contents });
    } catch (error) {
      return "Error de conexión con el asistente.";
    }
  }
};