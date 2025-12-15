import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Asegúrate de que la ruta sea correcta según tu estructura de carpetas
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 SISTEMA: Inicializando Motor Multi-Modelo (Prioridad: Gemini 2.0 -> 1.5 Specific)");

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ ERROR CRÍTICO: Falta VITE_GOOGLE_GENAI_API_KEY en variables de entorno.");
}

// 🛡️ LISTA DE COMBATE (Failover System)
// El sistema probará estos modelos en orden estricto.
// NOTA: Usamos versiones específicas (-002) para evitar errores 404 de alias genéricos.
const MODELS_TO_TRY = [
  "gemini-2.0-flash-exp",    // 1. EXPERIMENTAL: Alta velocidad y precisión (Tu favorito)
  "gemini-1.5-flash-002",    // 2. ESTABLE: Versión específica actualizada (Evita error 404)
  "gemini-1.5-pro-002",      // 3. RESPALDO INTELIGENTE: Mayor razonamiento si los Flash fallan
  "gemini-1.5-flash-8b"      // 4. EMERGENCIA: Modelo ultra ligero
];

// Configuración de Seguridad: Permisiva para terminología médica legítima
const SAFETY_SETTINGS = [
  { 
    category: HarmCategory.HARM_CATEGORY_HARASSMENT, 
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE 
  },
  { 
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, 
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE 
  },
  { 
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, 
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH // Importante para ginecología/urología
  },
  { 
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, 
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE 
  },
];

// ==========================================
// 2. UTILIDADES INTERNAS
// ==========================================

/**
 * Limpiador de JSON agresivo.
 * Elimina markdown, espacios basura y extrae solo el objeto válido.
 */
const cleanJSON = (text: string): string => {
  try {
    // 1. Eliminar bloques de código markdown
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    
    // 2. Buscar límites del JSON (Objeto {} o Array [])
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    // 3. Recortar string sobrante
    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    
    return clean.trim();
  } catch (e) {
    // Si falla la limpieza, devolvemos el original para que el parser intente o falle visiblemente
    return text;
  }
};

/**
 * MOTOR DE CONEXIÓN EN CASCADA (FAILOVER)
 * Intenta conectar con varios modelos en secuencia hasta obtener respuesta.
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  if (!API_KEY) throw new Error("API Key no configurada.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  // Bucle de intentos: Si el modelo 1 falla, prueba el 2, etc.
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          responseMimeType: jsonMode ? "application/json" : "text/plain"
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text && text.length > 0) {
        console.log(`✅ Conexión exitosa con IA usando modelo: ${modelName}`);
        return text;
      }
    } catch (error: any) {
      console.warn(`⚠️ Fallo en modelo ${modelName}: ${error.message || 'Error desconocido'}. Intentando siguiente...`);
      lastError = error;
      // El bucle 'continue' es implícito, pasamos al siguiente modelo
    }
  }

  // Si terminamos el bucle y nada funcionó:
  console.error("❌ TODOS LOS MODELOS DE IA FALLARON.");
  throw new Error(`Error IA Irrecuperable: ${lastError?.message || "Verifica tu conexión y API Key."}`);
}

/**
 * Generador de perfiles de rol según especialidad
 */
const getSpecialtyConfig = (specialty: string) => ({
  role: `Escriba Clínico Experto y Auditor Médico (MediScribe AI) especializado en ${specialty}`,
  focus: "Generar documentación clínica técnica, precisa, legalmente blindada y basada en evidencia."
});

// ==========================================
// 3. SERVICIO PRINCIPAL EXPORTADO
// ==========================================
export const GeminiMedicalService = {

  // ---------------------------------------------------------------------------
  // A. GENERACIÓN DE NOTA CLÍNICA (CORE)
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      const prompt = `
        ROL: ${profile.role}. 
        OBJETIVO: ${profile.focus}
        
        INSTRUCCIONES:
        Genera un JSON válido basado EXCLUSIVAMENTE en la transcripción proporcionada.
        No inventes información no mencionada.
        
        DATOS DE ENTRADA:
        - HISTORIAL PACIENTE: "${patientHistory || "No disponible"}"
        - TRANSCRIPCIÓN CONSULTA: "${transcript.replace(/"/g, "'").trim()}"

        ESTRUCTURA JSON REQUERIDA (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica completa de la consulta (Historia Clínica).",
          "soapData": {
            "subjective": "Padecimiento actual, síntomas mencionados e interrogatorio.",
            "objective": "Signos vitales y hallazgos físicos (si existen en el audio).",
            "analysis": "Razonamiento clínico e impresión diagnóstica.",
            "plan": "Tratamiento, recetas y estudios solicitados verbalmente."
          },
          "clinical_suggestions": [
            "Sugerencia clínica 1 (basada en guías)",
            "Sugerencia clínica 2"
          ],
          "patientInstructions": "Instrucciones claras para el cuidado del paciente en casa.",
          "risk_analysis": { 
            "level": "Bajo" | "Medio" | "Alto", 
            "reason": "Explicación breve del nivel de riesgo." 
          },
          "actionItems": { 
            "next_appointment": "Fecha sugerida o null", 
            "urgent_referral": false, 
            "lab_tests_required": ["Lista de estudios"] 
          },
          "conversation_log": []
        }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error crítico generando Nota Clínica:", error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE 360 (HISTORIAL)
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial reciente.";
      
      const prompt = `
        ACTÚA COMO: Auditor Médico Senior.
        PACIENTE: ${patientName}.
        HISTORIAL PREVIO: ${historySummary}
        EVOLUCIÓN RECIENTE: ${contextText}

        Analiza y genera JSON:
        {
          "evolution": "Resumen narrativo de la evolución.",
          "medication_audit": "Revisión de medicamentos y adherencia.",
          "risk_flags": ["Bandera roja 1", "Bandera roja 2"],
          "pending_actions": ["Acción pendiente 1"]
        }
      `;
      
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as PatientInsight;
    } catch (e) {
      console.warn("Fallo parcial en Análisis 360", e);
      return { 
        evolution: "No disponible.", 
        medication_audit: "Sin datos.", 
        risk_flags: [], 
        pending_actions: [] 
      };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN DE MEDICAMENTOS (RECETA RÁPIDA)
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text || text.length < 5) return [];
    
    try {
      const prompt = `
        TAREA: Extraer medicamentos del texto.
        TEXTO: "${text.replace(/"/g, "'")}"
        
        Responde SOLO con un Array JSON:
        [
          { 
            "drug": "Nombre medicamento", 
            "details": "Dosis/Presentación", 
            "frequency": "Frecuencia", 
            "duration": "Duración" 
          }
        ]
      `;
      
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return []; 
    }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD DE NOTA
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad.
        NOTA: "${noteContent}"
        
        JSON esperado: 
        { 
          "riskLevel": "Bajo" | "Medio" | "Alto", 
          "score": 0-100, 
          "analysis": "Breve análisis", 
          "recommendations": ["Rec 1", "Rec 2"] 
        }
      `;
      
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { 
      return { riskLevel: "Bajo", score: 100, analysis: "No disponible", recommendations: [] }; 
    }
  },

  // ---------------------------------------------------------------------------
  // E. PLAN DE SEGUIMIENTO (WHATSAPP)
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        Genera 3 mensajes de WhatsApp para seguimiento de ${patientName}.
        Nota: "${clinicalNote}". 
        Instrucciones: "${instructions}"
        
        JSON Array esperado: 
        [
          { "day": 1, "message": "Texto mensaje..." }, 
          { "day": 3, "message": "Texto mensaje..." }, 
          { "day": 7, "message": "Texto mensaje..." }
        ]
      `;
      
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { 
      return []; 
    }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL (ASISTENTE IA)
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
          ERES: Asistente médico MediScribe.
          CONTEXTO: ${context}
          PREGUNTA: "${userMessage}"
          Responde de forma breve y técnica.
       `;
       return await generateWithFailover(prompt, false);
    } catch (e) { 
      return "El asistente no está disponible por el momento."; 
    }
  },

  // ---------------------------------------------------------------------------
  // G. FUNCIONES LEGACY (COMPATIBILIDAD)
  // ---------------------------------------------------------------------------
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { 
    return this.generatePatient360Analysis(p, h, c); 
  },
  
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { 
    return this.extractMedications(t); 
  },
  
  async generatePrescriptionOnly(t: string): Promise<string> { 
    return "Función obsoleta. Use extracción de medicamentos."; 
  }
};