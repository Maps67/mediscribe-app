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
        // 🔥 AJUSTE CRÍTICO: Temperatura baja para consistencia médica
        generationConfig: {
            temperature: 0.2, // Antes era variable, ahora es estricto (casi determinista)
            topP: 0.8,
            topK: 40,
            responseMimeType: jsonMode ? "application/json" : "text/plain"
        }
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

  // --- A. NOTA CLÍNICA (V5.5 - ESTABILIDAD TOTAL) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      // Prompt Reforzado v5.5 (Anti-Alucinaciones)
      const prompt = `
        ROL: Eres "MediScribe AI", un Auditor Médico Robótico. NO eres creativo. Eres LITERAL.
        ESPECIALIDAD: ${profile.role}.
        ENFOQUE: ${profile.focus}
        
        INSTRUCCIONES DE ESTABILIDAD:
        1. Tu análisis debe ser DETERMINISTA. Si procesas este mismo texto 10 veces, debes dar el mismo diagnóstico 10 veces.
        2. NO inventes síntomas que no se mencionan explícitamente.
        3. NO asumas medicamentos si no se escuchan claramente.

        🔥🔥 FASE 1: EXTRACCIÓN DE DATOS 🔥🔥
        1. Identifica al Médico y al Paciente (Diarización).
        2. Extrae ANAMNESIS DE LA TRANSCRIPCIÓN.

        💀💀 FASE 2: REGLAS DE RIESGO (MATEMÁTICAS, NO OPINIONES) 💀💀
        Tu cálculo de riesgo ('risk_analysis.level') debe seguir ESTRICTAMENTE esta lógica:
        
        - NIVEL ALTO (🔴): 
            1. Embarazo + Fármacos Teratogénicos (Warfarina, IECA, Retinoides).
            2. Interacción Mortal (Sildenafil + Nitratos).
            3. Signos Vitales de Choque (Hipotensión severa, Taquicardia extrema reportada).
            4. Ideación suicida o riesgo de daño a terceros.
        
        - NIVEL MEDIO (🟡): 
            1. Polifarmacia (más de 5 medicamentos).
            2. Enfermedad crónica descontrolada (mencionada explícitamente).
            3. Síntomas agudos persistentes sin signos de alarma vital.

        - NIVEL BAJO (🟢): 
            1. Control de rutina.
            2. Padecimiento menor (resfriado, dermatitis leve).
            3. Paciente sano.

        SI NO CUMPLE CRITERIOS DE ALTO O MEDIO, ES BAJO POR DEFECTO. NO DUDES.

        🔥🔥 FASE 3: GENERACIÓN ESTRUCTURADA (JSON) 🔥🔥

        DATOS DE ENTRADA:
        - Historial Previo: "${patientHistory || "Sin datos"}"
        - Transcripción Actual: "${transcript.replace(/"/g, "'").trim()}"

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Resumen narrativo profesional y objetivo.",
          "soapData": {
            "subjective": "Lo que el paciente refiere (SÍNTOMAS).",
            "objective": "Lo que el médico observa o mide (SIGNOS).",
            "analysis": "Diagnóstico y razonamiento clínico basado ÚNICAMENTE en la evidencia presentada.",
            "plan": "Tratamiento y pasos a seguir."
          },
          "patientInstructions": "Instrucciones claras para el paciente.",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Cita la regla exacta de la Fase 2 que se activó."
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
            "evolution": "Resumen conciso.",
            "medication_audit": "Interacciones o duplicidades.",
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
       const prompt = `CONTEXTO: ${context}. PREGUNTA: ${userMessage}. RESPUESTA CORTA Y DIRECTA:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Error conexión."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};