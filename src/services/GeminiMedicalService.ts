import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase';
import { PatientInsight } from '../types';

// ==========================================
// 1. CONFIGURACIÓN CRÍTICA
// ==========================================

// Leemos la clave, soportando ambos nombres por seguridad
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

// MODELO: Usamos la versión estable 1.5. 
// IMPORTANTE: Requiere haber ejecutado 'npm install @google/generative-ai@latest'
const MODEL_NAME = "gemini-1.5-flash"; 

if (!API_KEY) {
  console.error("⛔ FATAL: No se encontró API Key en el archivo .env");
}

// ==========================================
// 2. MOTOR DE PERFILES CLÍNICOS (El cerebro médico)
// ==========================================
// Este bloque define cómo "piensa" la IA según la especialidad seleccionada.

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
      bias: "Evalúa todo en contexto de la edad. Tono tranquilizador para padres.",
      keywords: "Percentil, Desarrollo psicomotor, Lactancia, Esquema de vacunación."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo y patología pélvica.",
      bias: "Enfoque en antecedentes gineco-obstétricos.",
      keywords: "FUM, Gestas, Partos, Cesáreas, Ultrasonido, Cérvix."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia oportuna.",
      bias: "Enfoque holístico y preventivo.",
      keywords: "Sintomático, Referencia, Preventivo, Estilo de vida."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías y terminología propia de ${specialty}.`,
    bias: `Criterios clínicos estándar de ${specialty}.`,
    keywords: "Términos técnicos."
  };
};

// ==========================================
// 3. UTILIDADES DE SEGURIDAD (Helpers)
// ==========================================

const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  const firstSquare = clean.indexOf('[');
  const lastSquare = clean.lastIndexOf(']');

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
      if (lastCurly !== -1) clean = clean.substring(firstCurly, lastCurly + 1);
  } else if (firstSquare !== -1) {
      if (lastSquare !== -1) clean = clean.substring(firstSquare, lastSquare + 1);
  }
  return clean.trim();
};

/**
 * REINTENTOS AUTOMÁTICOS:
 * Si Google da error 429 (Cuota) o 503 (Servidor), reintenta automáticamente.
 */
async function generateWithRetry(model: any, prompt: string): Promise<string> {
  const MAX_RETRIES = 2; 
  let retries = 0;
  
  while (true) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      if (retries >= MAX_RETRIES) throw error;

      // Filtramos errores recuperables
      const isRecoverable = error.message?.includes('429') || error.status === 429 || error.status === 503 || error.message?.includes('fetch');
      
      if (isRecoverable) {
        console.warn(`⚠️ API inestable. Reintentando... (${retries + 1}/${MAX_RETRIES})`);
        retries++;
        // Espera exponencial: 2s, 4s
        const delay = 2000 * Math.pow(2, retries - 1);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error; // Errores graves (como API Key inválida) no se reintentan
      }
    }
  }
}

// ==========================================
// 4. SERVICIO PRINCIPAL
// ==========================================

export const GeminiMedicalService = {

  // --- A. GENERAR NOTA CLÍNICA (CORE) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      
      // Obtenemos la configuración del especialista
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL DEL SISTEMA: Actúas como "MediScribe AI", asistente clínico.
        PERFIL MÉDICO: Eres un ${profile.role}.
        
        TU ENFOQUE CLÍNICO: ${profile.focus}
        TUS PREFERENCIAS: ${profile.bias}
        PALABRAS CLAVE ESPERADAS: ${profile.keywords}
        
        CONTEXTO ACTUAL:
        - Fecha: ${now.toLocaleDateString()}
        - Historial del Paciente: "${patientHistory}"
        
        TRANSCRIPCIÓN DE LA CONSULTA:
        "${cleanTranscript}"
        
        INSTRUCCIONES DE SALIDA:
        Genera un objeto JSON estricto para una Nota de Evolución (SOAP).
        1. NO inventes información no mencionada.
        2. Detecta BANDERAS ROJAS (Riesgos) si existen.
        3. Usa terminología médica técnica apropiada para ${specialty}.
        
        ESTRUCTURA JSON REQUERIDA:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
             "subjective": "Resumen narrativo de síntomas...", 
             "objective": "Hallazgos objetivos y vitales...", 
             "assessment": "Análisis e impresión diagnóstica...", 
             "plan": "Plan de manejo, estudios y tratamiento...", 
             "suggestions": ["Sugerencia basada en guías clínicas..."] 
          }, 
          "patientInstructions": "Instrucciones en lenguaje sencillo para el paciente...", 
          "risk_analysis": { 
              "level": "Bajo"|"Medio"|"Alto", 
              "reason": "Justificación breve del nivel de riesgo..." 
          } 
        }
      `;

      const textResponse = await generateWithRetry(model, prompt);
      return JSON.parse(cleanJSON(textResponse));

    } catch (error) {
      console.error("❌ Error generando Nota Clínica:", error);
      throw error;
    }
  },

  // --- B. BALANCE CLÍNICO 360 (INSIGHTS) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

      const context = consultations.length > 0 ? consultations.join("\n--- CONSULTA PREVIA ---\n") : "Sin consultas previas.";
      
      const prompt = `
        ACTÚA COMO: Auditor Médico Senior.
        PACIENTE: ${patientName}
        HISTORIAL: ${historySummary}
        
        CONSULTAS PREVIAS:
        ${context}

        TAREA: Generar un balance clínico.
        FORMATO JSON:
        { 
          "evolution": "Breve análisis de la trayectoria clínica (Mejora/Empeora/Estable)...", 
          "medication_audit": "Resumen de fármacos utilizados y su efectividad aparente...", 
          "risk_flags": ["Riesgo detectado 1", "Riesgo detectado 2"], 
          "pending_actions": ["Estudio pendiente", "Interconsulta pendiente"] 
        }
      `;

      const textResponse = await generateWithRetry(model, prompt);
      return JSON.parse(cleanJSON(textResponse));
    } catch (e) {
      console.error("Error en Insights:", e);
      return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- C. EXTRACCIÓN DE MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

      const prompt = `
        ACTÚA COMO: Farmacéutico Clínico.
        TAREA: Extraer medicamentos, dosis y frecuencias del siguiente texto.
        TEXTO: "${text}"
        
        SALIDA: JSON Array exclusivamente.
        [{ "drug": "Nombre Genérico/Comercial", "details": "Dosis/Concentración", "frequency": "Cada X horas", "duration": "Por X días", "notes": "Indicaciones extra" }]
      `;
      
      const textResponse = await generateWithRetry(model, prompt);
      const res = JSON.parse(cleanJSON(textResponse));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
     try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Usamos modelo de texto plano para chat natural
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        const prompt = `
          CONTEXTO CLÍNICO DEL PACIENTE: 
          ${context}
          
          PREGUNTA DEL USUARIO (MÉDICO): 
          "${userMessage}"
          
          RESPUESTA (Se breve, directo y profesional):
        `;
        return await generateWithRetry(model, prompt);
     } catch (e) { return "Lo siento, hubo un error de conexión con el asistente."; }
  },

  // --- E. ALIAS DE COMPATIBILIDAD (Legacy Support) ---
  // Mantenemos estas funciones para no romper componentes antiguos que las llamen
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};

// ==========================================
// 5. DEFINICIONES DE TIPOS (INTERFACES)
// ==========================================

export interface ChatMessage { role: 'user' | 'model'; text: string; }

export interface SoapNote { 
  subjective: string; 
  objective: string; 
  assessment: string; 
  plan: string; 
  suggestions: string[]; 
}

export interface ConversationLine { 
  speaker: 'Médico' | 'Paciente' | 'Desconocido'; 
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

export interface FollowUpMessage { day: number; message: string; }

export interface PatientInsight { 
  evolution: string; 
  medication_audit: string; 
  risk_flags: string[]; 
  pending_actions: string[]; 
}