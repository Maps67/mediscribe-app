import { GoogleGenerativeAI } from "@google/generative-ai";
// Importamos interfaces locales para evitar errores de compilación
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: MODO PRO (Facturación + Inteligencia Completa + Hybrid Retrieval)");

// ==========================================
// 1. CONFIGURACIÓN ROBUSTA
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada. Revisa tu archivo .env");

// LISTA DE COMBATE (Failover System)
const MODELS_TO_TRY = [
  "gemini-1.5-flash-002",    // 1. La versión más inteligente y actual (Prioridad)
  "gemini-1.5-flash",        // 2. La versión estándar estable
  "gemini-1.5-pro",          // 3. Respaldo de alta potencia
  "gemini-2.0-flash-exp"     // 4. Último recurso
];

// ==========================================
// 2. UTILIDADES DE INTELIGENCIA
// ==========================================

const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
    clean = clean.substring(firstCurly, lastCurly + 1);
  }
  return clean.trim();
};

/**
 * MOTOR DE CONEXIÓN BLINDADO (FAILOVER)
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text) return text; // ¡Éxito!
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} falló/ocupado. Cambiando al siguiente...`);
      lastError = error;
      continue; 
    }
  }
  throw lastError || new Error("Todos los modelos de IA fallaron. Verifica tu conexión.");
}

/**
 * MOTOR DE PERFILES (PERSONALIDAD CLÍNICA)
 */
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico. Traduce síntomas vagos a equivalentes cardiológicos."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad. Usa tono adecuado para padres."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo, vitalidad fetal.",
      bias: "Enfoque en bienestar materno-fetal."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia oportuna.",
      bias: "Enfoque holístico y preventivo."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Senior",
        focus: "ABCDE, estabilización. CRÍTICO: Detectar errores fatales antes de tratar.",
        bias: "Primero NO hacer daño (Primum non nocere). Verifica contraindicaciones antes de recetar."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías y terminología de ${specialty}.`,
    bias: `Criterios clínicos estándar de ${specialty}.`
  };
};

// ==========================================
// 3. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA (V5.3 - GRIM REAPER PROTOCOL) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      // Prompt Reforzado v5.3
      const prompt = `
        ROL: Eres "MediScribe AI", Auditor de Seguridad Clínica en Tiempo Real.
        ESPECIALIDAD: ${profile.role}.
        ENFOQUE: ${profile.focus}
        
        🔥🔥 FASE 1: EXTRACCIÓN DE DATOS 🔥🔥
        1. Identifica al Médico y al Paciente (Diarización).
        2. Extrae ANAMNESIS DE LA TRANSCRIPCIÓN: ¿Qué medicamentos o condiciones menciona el paciente?
           - *Nota:* Si el paciente dice "tomé X ayer/anoche", asume que está ACTIVO en su sistema.

        💀💀 FASE 2: PROTOCOLO "GRIM REAPER" (VERIFICACIÓN MORTAL) 💀💀
        ANTES de generar cualquier plan, verifica si existe alguna de estas "COMBINACIONES PROHIBIDAS".
        
        REGLA DE LAS 48 HORAS: Si el paciente menciona haber tomado Inhibidores PDE5 (Sildenafil, Viagra, Tadalafil) en las últimas 48 horas (ej. "ayer", "anoche", "hoy")...
        ...Y el médico receta NITRATOS (Isosorbide, Nitroglicerina)...
        >>> ¡ES UNA SENTENCIA DE MUERTE POR HIPOTENSIÓN REFRACTARIA! <<<

        SI DETECTAS ESTO (O cualquier otra interacción letal obvia):
        1. 🛑 ACTIVAR FRENO DE EMERGENCIA:
           - 'risk_analysis.level' = "Alto" (OBLIGATORIO).
           - 'risk_analysis.reason' = "PELIGRO MORTAL: Interacción Nitratos + Sildenafil (Uso < 48h). Riesgo de choque hipotensivo irreversible."
        
        2. 🛑 BLOQUEO DE INSTRUCCIONES (CRÍTICO):
           - En el campo 'patientInstructions', TIENES PROHIBIDO escribir la orden del médico de tomar el medicamento letal.
           - DEBES escribir EXACTAMENTE: "⚠️ ALERTA DE SEGURIDAD MÁXIMA: El sistema ha bloqueado la administración de Isosorbide/Nitratos debido al uso reciente de Sildenafil. Riesgo de muerte. NO ADMINISTRAR."

        🔥🔥 FASE 3: GENERACIÓN ESTRUCTURADA 🔥🔥
        Solo si pasas la Fase 2 sin alertas mortales, procede con el plan estándar.
        Si hay alerta mortal, el 'plan' en SOAP debe reflejar la suspensión del medicamento y la reevaluación.

        DATOS DE ENTRADA:
        - Historial Previo: "${patientHistory || "Sin datos"}"
        - Transcripción Actual: "${transcript.replace(/"/g, "'").trim()}"

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Resumen narrativo...",
          "soap": {
            "subjective": "Incluye OBLIGATORIAMENTE el uso de medicamentos mencionados (ej. Sildenafil)...",
            "objective": "Hallazgos...",
            "assessment": "Diagnóstico...",
            "plan": "Pasos a seguir (Modificados por seguridad si hay riesgo)...",
            "suggestions": ["Sugerencia 1"]
          },
          "patientInstructions": "Instrucciones SEGURAS (Filtradas por Protocolo Grim Reaper)...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Si hay interacción, descríbela AQUÍ."
          },
          "actionItems": {
             "urgent_referral": boolean,
             "lab_tests_required": ["..."]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ]
        }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- B. BALANCE 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA ---\n\n") 
          : "Sin historial previo.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          PACIENTE: "${patientName}".
          HISTORIAL: ${historySummary || "No registrado"}
          CONSULTAS: ${contextText}

          SALIDA JSON (PatientInsight):
          {
            "evolution": "Resumen...",
            "medication_audit": "Busca duplicidades o interacciones...",
            "risk_flags": ["Riesgo 1"],
            "pending_actions": ["Acción 1"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- C. EXTRACCIÓN MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico. Extrae medicamentos del texto: "${text.replace(/"/g, "'")}".
        SALIDA JSON ARRAY (MedicationItem[]):
        [{ "drug": "...", "details": "...", "frequency": "...", "duration": "...", "notes": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA CALIDAD ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad. Evalúa nota: "${noteContent}".
        SALIDA JSON: { "riskLevel": "...", "score": 85, "analysis": "...", "recommendations": ["..."] }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "", recommendations: [] }; }
  },

  // --- E. WHATSAPP ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente. Redacta 3 mensajes WhatsApp para ${patientName}.
        Contexto: "${clinicalNote}". Instrucciones: "${instructions}".
        SALIDA JSON ARRAY: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- F. CHAT ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${context}. PREGUNTA: ${userMessage}. RESPUESTA CORTA:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Error conexión."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};