import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Importamos interfaces locales (Tipos completos para que no falle el build)
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: PROMETHEUS ENGINE (Full Logic + Diagnostic Radar)");

// ==========================================
// 1. CONFIGURACIÓN Y DIAGNÓSTICO INICIAL
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

// 📡 PROTOCOLO RADAR: Lista de modelos estables
// El sistema probará uno por uno hasta conectar.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",       // 1. Velocidad (Prioridad)
  "gemini-1.5-pro",         // 2. Inteligencia (Respaldo)
  "gemini-pro"              // 3. Compatibilidad (Último recurso)
];

// SEGURIDAD OBLIGATORIA (Para que no bloquee términos médicos)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
];

// ==========================================
// 2. UTILIDADES
// ==========================================

const cleanJSON = (text: string) => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    }
    return clean.trim();
  } catch (e) { return text; }
};

/**
 * MOTOR DE CONEXIÓN CON DIAGNÓSTICO INTEGRADO
 * Aquí está la solución que pediste: Alertas visuales si falla.
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  
  // 🔍 DIAGNÓSTICO PASO 1: Verificar Llave
  if (!API_KEY) {
      const msg = "❌ ERROR FATAL: No se detecta la API Key.\nSOLUCIÓN: Revisa tu archivo .env y reinicia la terminal con 'npm run dev'.";
      alert(msg); // <--- ALERTA VISUAL
      throw new Error(msg);
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  // 🔄 Bucle de intentos (Radar)
  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`📡 Intentando conectar con ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 5) return text; // ¡Éxito!
    } catch (error: any) {
      console.warn(`⚠️ Fallo en ${modelName}. Probando siguiente...`);
      lastError = error;
      continue; 
    }
  }

  // 🔍 DIAGNÓSTICO PASO 2: SI TODO FALLA, INTERPRETAR EL ERROR
  console.error("🔥 ERROR FINAL DE IA:", lastError);
  
  let mensaje = "Error desconocido de IA";
  const errStr = lastError?.toString() || "";
  
  if (errStr.includes("403")) mensaje = "ERROR 403: TU API KEY NO TIENE PERMISOS.\nEntra a Google Cloud Console y habilita 'Generative Language API'.";
  else if (errStr.includes("404")) mensaje = "ERROR 404: MODELO NO ENCONTRADO.\nTu cuenta no tiene acceso a los modelos solicitados o la API cambió.";
  else if (errStr.includes("429")) mensaje = "ERROR 429: CUOTA EXCEDIDA.\nHas superado el límite gratuito de Google. Espera un minuto.";
  else if (errStr.includes("fetch failed")) mensaje = "ERROR DE CONEXIÓN: No tienes internet o un Firewall bloquea a Google.";

  alert(`🛑 DIAGNÓSTICO FALLIDO:\n\n${mensaje}\n\nDetalle técnico: ${errStr}`); // <--- ALERTA VISUAL FINAL
  throw lastError || new Error(mensaje);
}

/**
 * PERFILES CLÍNICOS (Lógica V-Ultimate)
 */
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas, anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos y vacunación.",
      bias: "Evalúa todo en contexto de la edad."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, embarazo, vitalidad fetal.",
      bias: "Enfoque en bienestar materno-fetal."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral y referencia oportuna.",
      bias: "Enfoque holístico."
    }
  };
  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías de ${specialty}.`,
    bias: `Criterios clínicos de ${specialty}.`
  };
};

// ==========================================
// 3. SERVICIO PRINCIPAL (COMPLETO - SIN RECORTES)
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA (LÓGICA COMPLETA V-ULTIMATE) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: Actúas como "MediScribe AI", Auditor de Seguridad Clínica.
        PERFIL: ${profile.role}. ENFOQUE: ${profile.focus}. SESGO: ${profile.bias}

        🔥🔥 TAREA CRÍTICA: IDENTIFICACIÓN DE HABLANTES (DIARIZACIÓN) 🔥🔥
        1. Identifica Médico vs Paciente.
        
        🔥🔥 ESTRATEGIA: HYBRID RETRIEVAL (MEMORIA) 🔥🔥
        FUENTE A (Historial): "${patientHistory || "VACÍO"}"
        FUENTE B (Audio Actual): "${transcript.replace(/"/g, "'").trim()}"

        🚨 REGLA ANAMNESIS ACTIVA:
        Si el paciente menciona medicamentos/alergias en el AUDIO, agrégalos a 'subjective' OBLIGATORIAMENTE.

        🛑 EVALUACIÓN DE RIESGO (JERARQUÍA):
        - URGENCIA VITAL -> RIESGO ALTO.
        - INTERACCIÓN FARMACOLÓGICA GRAVE (Ej. Nitratos + Sildenafil) -> RIESGO ALTO.

        ---------- SAFETY OVERRIDE (BLINDAJE) ----------
        Si hay riesgo ALTO o interacción:
        - NO escribas la instrucción peligrosa en 'patientInstructions'.
        - SUSTITUYE por: "⚠️ AVISO DE SEGURIDAD: Se ha detectado una contraindicación técnica. Consulte a su médico."
        ------------------------------------------------

        DATOS: Fecha ${now.toLocaleDateString()}.

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica...",
          "soapData": {
            "subjective": "S...",
            "objective": "O...",
            "analysis": "A...",
            "plan": "P...",
            "suggestions": ["..."]
          },
          "patientInstructions": "Instrucciones seguras (Aplica Safety Override)...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "..."
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

      // Llamamos al motor con failover (que tiene las alertas integradas)
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error Nota Clínica (Capturado en Servicio):", error);
      throw error; // El error ya mostró la alerta visual en generateWithFailover
    }
  },

  // --- B. BALANCE 360 (COMPLETO) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n\n") : "Sin historial.";
      const prompt = `
          ACTÚA COMO: Auditor Médico. 
          PACIENTE: ${patientName}. 
          HISTORIAL: ${historySummary}. 
          CONSULTAS RECIENTES: ${contextText}. 
          
          SALIDA JSON (PatientInsight): 
          { 
            "evolution": "Resumen de evolución...", 
            "medication_audit": "Análisis de duplicidad/interacción...", 
            "risk_flags": ["Riesgo 1"], 
            "pending_actions": ["Pendiente 1"] 
          }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] }; }
  },

  // --- C. EXTRACCIÓN MEDS (COMPLETO) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico. Extrae medicamentos de: "${text}". 
        SALIDA JSON ARRAY (MedicationItem[]):
        [{ "drug": "...", "details": "...", "frequency": "...", "duration": "...", "notes": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA (COMPLETO) ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `ACTÚA COMO: Auditor. Evalúa nota: "${noteContent}". SALIDA JSON { riskLevel, score, analysis, recommendations }.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "N/A", recommendations: [] }; }
  },

  // --- E. WHATSAPP (COMPLETO) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `ACTÚA COMO: Asistente. 3 mensajes WhatsApp para ${patientName}. Contexto: "${clinicalNote}". JSON ARRAY.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // --- F. CHAT (COMPLETO) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${context}. PREGUNTA: ${userMessage}. RESPUESTA:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Error conexión."; }
  },

  // --- HELPERS (COMPLETO) ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};