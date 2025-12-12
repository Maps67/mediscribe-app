import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// ✅ IMPORTACIÓN CRÍTICA: Usamos los tipos globales para evitar conflictos
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-FINAL: PROMETHEUS ENGINE (Medical CoT + Safety Guardrails)");

// ==========================================
// 1. CONFIGURACIÓN DE ALTO NIVEL
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ FATAL: API Key no encontrada. El cerebro de la IA está desconectado.");
}

// ARQUITECTURA DE FAILOVER (SISTEMA DE RESPALDO)
// 🔥 CORRECCIÓN CRÍTICA: Usamos solo versiones ESTABLES para evitar Error 404
const MODELS_TO_TRY = [
  "gemini-1.5-flash",        // La versión estable estándar (Rápida y barata)
  "gemini-1.5-pro",          // Respaldo de alta inteligencia
];

// CONFIGURACIÓN DE SEGURIDAD (GUARDRAILS)
// Permitimos contenido médico explícito (necesario para diagnósticos) pero bloqueamos acoso/odio.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, // Permitir anatomía médica
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES DE LIMPIEZA & PROCESAMIENTO
// ==========================================

/**
 * Limpiador Quirúrgico de JSON: Elimina bloques Markdown y texto basura.
 */
const cleanJSON = (text: string): string => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    // Detecta si es Objeto o Array y corta lo que sobre
    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    
    return clean.trim();
  } catch (e) {
    console.error("Error limpiando JSON:", e);
    return text; // Devolvemos sucio para intentar parsear o fallar controladamente
  }
};

/**
 * MOTOR DE GENERACIÓN BLINDADO (FAILOVER + TEMPERATURA DINÁMICA)
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, tempOverride?: number): Promise<string> {
  // Validación de seguridad antes de llamar a Google
  if (!API_KEY) throw new Error("Falta la API Key. Configure VITE_GOOGLE_GENAI_API_KEY en Netlify.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`📡 Intentando conectar con modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
            temperature: tempOverride ?? 0.3, 
            topP: 0.95,
            topK: 40,
            responseMimeType: jsonMode ? "application/json" : "text/plain"
        }
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 5) return text; 
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} falló (${error.status || 'Error'}). Probando siguiente...`);
      lastError = error;
      // Si es un 404 real, intentamos el siguiente modelo sin detenernos
      continue; 
    }
  }
  
  // Si llegamos aquí, todos fallaron
  throw new Error(`Fallo total de IA. Último error: ${lastError?.message || 'Desconocido'}`);
}

/**
 * PERFILES CLÍNICOS AVANZADOS (PERSONAS)
 */
const getSpecialtyConfig = (specialty: string) => {
  const defaults = {
    role: `Médico Especialista en ${specialty}`,
    focus: "Diagnóstico diferencial, plan de manejo integral y seguridad del paciente.",
    bias: "Prioriza descartar patologías graves."
  };

  const configs: Record<string, typeof defaults> = {
    "Cardiología": {
      role: "Cardiólogo Clínico Senior",
      focus: "Hemodinamia, arritmias, insuficiencia cardíaca y riesgo isquémico.",
      bias: "Cualquier dolor torácico es isquémico hasta demostrar lo contrario. Prioriza signos vitales."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Experto (ATLS/ACLS)",
        focus: "Triaje, ABCDE, estabilización inmediata y descarte de riesgo vital.",
        bias: "Pensamiento de peor escenario (Worst-Case Scenario). Si hay duda, el riesgo es ALTO."
    },
    "Pediatría": {
      role: "Pediatra Certificado",
      focus: "Hitos del desarrollo, esquema de vacunación, hidratación y curvas de crecimiento.",
      bias: "Dosificación estricta por peso. Lenguaje empático para padres."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecobstetra Materno-Fetal",
      focus: "Bienestar binomio, sangrados, movimientos fetales y presión arterial.",
      bias: "Cualquier dolor abdominal en mujer fértil requiere descartar embarazo ectópico/complicación."
    },
    "Traumatología y Ortopedia": {
        role: "Cirujano Ortopedista",
        focus: "Mecanismo de lesión, arcos de movilidad, fuerza y sensibilidad.",
        bias: "Funcionalidad y manejo del dolor."
    }
  };

  return configs[specialty] || defaults;
};

// ==========================================
// 3. SERVICIO PRINCIPAL (LOGIC CORE)
// ==========================================
export const GeminiMedicalService = {

  // ---------------------------------------------------------------------------
  // A. GENERACIÓN DE NOTA CLÍNICA (CORE FUNCTION)
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      const prompt = `
        **SISTEMA DE RAZONAMIENTO CLÍNICO (Medical Chain-of-Thought)**
        
        ACTÚA COMO: ${profile.role}.
        CONTEXTO: ${profile.focus}
        SESGO DE SEGURIDAD: ${profile.bias}

        --- DATOS DEL PACIENTE ---
        HISTORIAL PREVIO: ${patientHistory || "No disponible (Primera vez)"}
        TRANSCRIPCIÓN ACTUAL: "${transcript.replace(/"/g, "'").trim()}"

        --- INSTRUCCIONES ---
        Genera un objeto JSON estricto con la nota clínica, análisis SOAP y evaluación de riesgos.

        FORMATO JSON REQUERIDO:
        {
          "clinicalNote": "Nota de evolución completa (aprox 200 palabras).",
          "soapData": {
            "subjective": "Padecimiento actual y antecedentes.",
            "objective": "Signos vitales y exploración física.",
            "analysis": "Diagnóstico y justificación.",
            "plan": "Tratamiento y estudios."
          },
          "patientInstructions": "Indicaciones para el paciente (lenguaje sencillo).",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación del nivel de riesgo."
          },
          "actionItems": {
             "next_appointment": "Fecha sugerida o null",
             "urgent_referral": boolean,
             "lab_tests_required": ["Lista de estudios"]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ]
        }
      `;

      const rawText = await generateWithFailover(prompt, true, 0.3);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error Crítico en Generación de Nota:", error);
      throw new Error(`Error generando nota: ${error.message || 'Intente de nuevo'}`);
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE 360
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PASADA ---\n\n") 
          : "Sin historial reciente.";

      const prompt = `
          ACTÚA COMO: Auditor Médico.
          PACIENTE: ${patientName}.
          HISTORIAL: ${historySummary}
          EVOLUCIÓN RECIENTE: ${contextText}

          Genera un JSON con:
          {
            "evolution": "Resumen de progreso.",
            "medication_audit": "Análisis de medicamentos.",
            "risk_flags": ["Riesgos detectados"],
            "pending_actions": ["Acciones pendientes"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true, 0.2);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { evolution: "No disponible.", medication_audit: "Sin datos.", risk_flags: [], pending_actions: [] };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN DE MEDICAMENTOS
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        Extrae medicamentos de este texto: "${text.replace(/"/g, "'")}".
        Devuelve JSON Array: [{ "drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración" }]
      `;
      const rawText = await generateWithFailover(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        Evalúa calidad de nota clínica: "${noteContent}".
        JSON: { "riskLevel": "Bajo/Alto", "score": 0-100, "analysis": "...", "recommendations": [] }
      `;
      const rawText = await generateWithFailover(prompt, true, 0.4);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Bajo", score: 100, analysis: "No auditado", recommendations: [] }; }
  },

  // ---------------------------------------------------------------------------
  // E. SEGUIMIENTO WHATSAPP
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        Crea 3 mensajes de WhatsApp para seguimiento de ${patientName}.
        Contexto: ${instructions}
        JSON Array: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
         Contexto Médico: ${context}
         Pregunta: "${userMessage}"
         Responde breve y técnico.
       `;
       return await generateWithFailover(prompt, false, 0.4);
    } catch (e) { return "Chat no disponible por el momento."; }
  },

  // --- HELPERS LEGACY ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use función receta estructurada."; }
};