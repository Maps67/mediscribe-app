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
  drug: string;      
  details: string;   
  frequency: string; 
  duration: string;  
  notes: string;     
}

// --- UTILIDADES DE LIMPIEZA ---

const sanitizeInput = (input: string): string => input.replace(/ignore previous|system override/gi, "[BLOQUEADO]").trim();

/**
 * PARSER HÍBRIDO (TITANIO):
 * Intenta extraer JSON. Si falla, NO rompe la app; devuelve el texto crudo
 * formateado como si fuera una nota válida.
 */
const extractJSON = (text: string): any => {
  try {
    // 1. Limpieza de Markdown (```json ... ```)
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 2. Búsqueda quirúrgica de llaves
    const firstBrace = clean.search(/[{[]/);
    const lastBrace = clean.search(/[}\]]$/);

    if (firstBrace !== -1 && lastBrace !== -1) {
       // Intentamos recortar lo que está fuera de las llaves
       const candidate = clean.substring(firstBrace, lastBrace + 1);
       return JSON.parse(candidate);
    }

    // Si no hay llaves, forzamos el error para ir al catch (Plan B)
    throw new Error("No JSON found");

  } catch (e) {
    console.warn("⚠️ Fallo parseo JSON. Activando modo Híbrido (Texto Plano).");
    
    // PLAN B (HÍBRIDO): Devolvemos el texto sucio dentro de la estructura válida.
    // Esto evita el "Error IA" y muestra lo que la IA respondió.
    return {
        clinicalNote: text || "No se pudo generar texto.",
        patientInstructions: "Por favor, genere las instrucciones manualmente o intente de nuevo.",
        actionItems: { 
            next_appointment: null, 
            urgent_referral: false, 
            lab_tests_required: [] 
        }
    };
  }
};

// --- SERVICIO ---
export const GeminiMedicalService = {
  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("API Key faltante.");
    
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(URL, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Error Google: ${err.error?.message || response.status}`);
        }
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error: any) {
        console.error("Error de Red:", error);
        throw new Error(error.message || "Error de conexión");
    }
  },

  async generateQuickRxJSON(transcript: string): Promise<MedicationItem[]> {
    const prompt = `ROL: Médico. TAREA: Extraer medicamentos de: "${sanitizeInput(transcript)}". SALIDA: JSON Array puro: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}].`;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      // Para la receta intentamos ser estrictos, si falla devolvemos array vacío
      try {
          const clean = res.replace(/```json/gi, '').replace(/```/g, '').trim();
          const start = clean.indexOf('[');
          const end = clean.lastIndexOf(']');
          if (start !== -1 && end !== -1) return JSON.parse(clean.substring(start, end + 1));
          return JSON.parse(clean);
      } catch { return []; }
    } catch (e) { return []; }
  },

  async generateClinicalNote(transcript: string, specialty: string): Promise<GeminiResponse> {
    const prompt = `
      ACTÚA: Médico ${specialty}. 
      ANALIZA: "${sanitizeInput(transcript)}". 
      SALIDA: Objeto JSON (RFC8259).
      SCHEMA: { "clinicalNote": "SOAP completo", "patientInstructions": "Indicaciones", "actionItems": {...} }
    `;
    
    // Llamada a la API
    const rawText = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
    
    // Aquí aplicamos el parser híbrido que evita el crash
    return extractJSON(rawText);
  },

  async chatWithContext(ctx: string, history: ChatMessage[], msg: string): Promise<string> {
    const contents = [
        { role: 'user', parts: [{ text: `SISTEMA: ${ctx}` }] },
        { role: 'model', parts: [{ text: "Entendido." }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: sanitizeInput(msg) }] }
    ];
    try { return await this.callGeminiAPI({ contents }); } catch { return "Error de conexión."; }
  }
};