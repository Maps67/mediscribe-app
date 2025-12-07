import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada en .env");

// LISTA DE INTENTOS (Orden de prioridad)
// El sistema probará uno por uno hasta que funcione.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",        // 1. La opción estándar (rápida)
  "gemini-1.5-flash-001",    // 2. Versión estable numerada
  "gemini-1.5-flash-002",    // 3. Versión actualizada numerada
  "gemini-1.5-pro",          // 4. Versión potente (si Flash falla)
  "gemini-pro"               // 5. Versión legado (vieja confiable)
];

// ==========================================
// 2. DEFINICIÓN DE TIPOS
// ==========================================
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

// ==========================================
// 3. MOTOR DE RESILIENCIA (FAILOVER)
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

// Esta función intenta generar contenido probando múltiples modelos si es necesario
async function generateWithFailover(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`🔄 Intentando conectar con modelo: ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        // Eliminamos responseMimeType aquí para máxima compatibilidad con modelos viejos
        // Lo manejamos con limpieza manual
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        console.log(`✅ ¡Éxito con ${modelName}!`);
        return text; // Si llegamos aquí, funcionó. Retornamos y salimos del bucle.
      }
    } catch (error: any) {
      console.warn(`⚠️ Falló modelo ${modelName}:`, error.message || error);
      lastError = error;
      // No lanzamos error, dejamos que el bucle continúe con el siguiente modelo
      continue; 
    }
  }

  // Si terminamos el bucle y nada funcionó:
  console.error("❌ TODOS los modelos fallaron.");
  throw lastError || new Error("No se pudo conectar con ningún modelo de IA.");
}

// ==========================================
// 4. MOTOR DE PERSONALIDAD CLÍNICA
// ==========================================
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico. Traduce síntomas vagos a equivalentes cardiológicos.",
      keywords: "Insuficiencia, FEVI, NYHA, Ritmo Sinusal, QT, Isquemia."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión.",
      keywords: "Fractura, Esguince, Ligamento, Quirúrgico, Conservador, Neurovascular."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa.",
      keywords: "ABCD, Fototipo, Dermatosis, Biopsia, Crioterapia."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad. Tono para padres.",
      keywords: "Percentil, Desarrollo psicomotor, Lactancia, Esquema."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia.",
      bias: "Enfoque holístico.",
      keywords: "Sintomático, Referencia, Preventivo."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías de ${specialty}.`,
    bias: `Criterios clínicos de ${specialty}.`,
    keywords: "Términos técnicos."
  };
};

// ==========================================
// 5. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA (SOAP) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL DEL SISTEMA (HÍBRIDO):
        Actúas como "MediScribe AI", un asistente de documentación clínica administrativa.
        SIN EMBARGO, posees el conocimiento clínico profundo de un: ${profile.role}.

        TU OBJETIVO: 
        Procesar la transcripción y generar una Nota de Evolución (SOAP) estructurada y técnica.

        CONTEXTO LEGAL Y DE SEGURIDAD (CRÍTICO):
        1. NO DIAGNOSTICAS: Eres software de gestión. Usa "Cuadro compatible con", "Probable".
        2. DETECCIÓN DE RIESGOS (TRIAJE): Tu prioridad #1 es identificar "Red Flags".
           - Si detectas peligro vital o funcional, el campo 'risk_analysis' DEBE ser 'Alto'.
        3. FILTRADO DE RUIDO: Prioriza lo que el paciente describe fisiológicamente sobre lo que cree tener.

        CONFIGURACIÓN DE LENTE CLÍNICO (${specialty}):
        - TU ENFOQUE: ${profile.focus}
        - TU SESGO: ${profile.bias}
        
        CONTEXTO DE LA CONSULTA:
        - Fecha: ${currentDate} ${currentTime}
        - Historial: "${patientHistory}"
        
        TRANSCRIPCIÓN BRUTA:
        "${transcript.replace(/"/g, "'").trim()}"

        TAREA DE GENERACIÓN JSON:
        Genera un objeto JSON estricto (NO uses Markdown, solo texto plano JSON):
        1. conversation_log: Diálogo Médico/Paciente.
        2. soap: Estructura SOAP técnica.
        3. risk_analysis: Nivel de riesgo y justificación.
        4. patientInstructions: Instrucciones claras.

        FORMATO JSON DE SALIDA:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "...", 
            "objective": "...", 
            "assessment": "...", 
            "plan": "...", 
            "suggestions": [] 
          }, 
          "patientInstructions": "...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." } 
        }
      `;

      // USAMOS EL SISTEMA DE RESPALDO AUTOMÁTICO
      const rawText = await generateWithFailover(prompt);
      
      try {
        return JSON.parse(cleanJSON(rawText)) as GeminiResponse;
      } catch (e) {
        console.error("Error parseando JSON final:", rawText);
        throw new Error("La IA respondió, pero el formato JSON no es válido.");
      }

    } catch (error: any) {
      console.error("❌ Error Fatal Nota Clínica:", error);
      throw error;
    }
  },

  // --- BALANCE CLÍNICO 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- SIGUIENTE CONSULTA (CRONOLÓGICA) ---\n\n")
          : "No hay consultas previas registradas.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          OBJETIVO: Balance Clínico 360 para "${patientName}".
          
          DATOS DE ENTRADA:
          1. Antecedentes: ${historySummary || "No registrados"}
          2. Historial Reciente:
          ${contextText}

          ANÁLISIS REQUERIDO:
          1. EVOLUCIÓN: Trayectoria clínica (Mejoría/Deterioro).
          2. AUDITORÍA RX: Fármacos recetados y efectividad.
          3. RIESGOS: Banderas rojas latentes.
          4. PENDIENTES: Acciones no cerradas.

          JSON SALIDA ESTRICTO:
          {
            "evolution": "...",
            "medication_audit": "...",
            "risk_flags": ["..."],
            "pending_actions": ["..."]
          }
      `;

      const rawText = await generateWithFailover(prompt);
      return JSON.parse(cleanJSON(rawText)) as PatientInsight;
    } catch (e) {
      return { evolution: "No disponible (Error IA)", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- EXTRAER MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    try {
      const prompt = `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${text.replace(/"/g, "'")}". JSON ARRAY ESTRICTO: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`;
      
      const rawText = await generateWithFailover(prompt);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${context}. USUARIO: ${userMessage}. RESPUESTA PROFESIONAL:`;
       return await generateWithFailover(prompt);
    } catch (e) { return "Error de conexión con IA."; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};