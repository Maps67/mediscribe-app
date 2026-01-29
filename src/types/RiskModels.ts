// ==========================================
// 🏥 MODELOS DE DATOS: RIESGO QUIRÚRGICO
// Basado en: Gupta MICA & RCRI Standards
// ==========================================

// 1. CLASE ASA (Physical Status Classification System)
// Define la salud física general del paciente antes de la cirugía.
export type AsaClass = 1 | 2 | 3 | 4 | 5;

// 2. ESTADO FUNCIONAL (Gupta Model)
// Capacidad del paciente para realizar actividades de la vida diaria.
export enum FunctionalStatus {
  INDEPENDENT = 'independent',             // Sin asistencia
  PARTIALLY_DEPENDENT = 'partially',       // Asistencia ocasional/parcial
  TOTALLY_DEPENDENT = 'totally'            // Asistencia total
}

// 3. CATEGORÍA DEL PROCEDIMIENTO (Gupta Model - Simplified)
// Cada categoría tiene un peso estadístico diferente en el riesgo cardíaco.
export enum ProcedureCategory {
  ANORECTAL = 'anorectal',
  AORTIC = 'aortic',
  BARIATRIC = 'bariatric',
  BRAIN = 'brain',
  BREAST = 'breast',
  CARDIAC = 'cardiac',
  ENT = 'ent', // Otorrinolaringología
  FOREGUT_HEPATOBILIARY = 'foregut', // Estómago/Hígado
  INTESTINAL = 'intestinal',
  NECK = 'neck', // Tiroides/Paratiroides
  OBGYN = 'obgyn', // Ginecología
  ORTHOPEDIC = 'orthopedic',
  SPINE = 'spine',
  THORACIC = 'thoracic', // Pulmón (No cardíaco)
  VASCULAR = 'vascular', // Periférico
  UROLOGY = 'urology',
  OTHER = 'other'
}

// ==========================================
// 📥 INPUTS: Lo que pedimos al cirujano
// ==========================================
export interface RiskCalculatorInputs {
  // --- DATOS AUTOMÁTICOS (Vienen del Perfil) ---
  age: number;               // Edad en años
  
  // --- DATOS CLÍNICOS (Selección Manual) ---
  asaClass: AsaClass;        // I-V
  functionalStatus: FunctionalStatus;
  
  // --- FACTORES ESPECÍFICOS ---
  creatinineGt15: boolean;   // ¿Creatinina sérica > 1.5 mg/dL?
  procedure: ProcedureCategory; // Tipo de cirugía
}

// ==========================================
// 📤 OUTPUTS: El resultado para el médico
// ==========================================
export interface RiskAssessmentResult {
  modelName: string;         // Ej: "Gupta MICA"
  riskPercentage: number;    // Ej: 1.25 (%)
  riskLevel: 'Bajo' | 'Elevado' | 'Alto'; // Interpretación semántica
  calculatedAt: Date;        // Fecha del cálculo
  
  // Metadatos para auditoría/transparencia
  inputsSnapshot: RiskCalculatorInputs; 
}

// Diccionario de etiquetas para la UI (Para no mostrar "anorectal" en minúsculas)
export const PROCEDURE_LABELS: Record<ProcedureCategory, string> = {
  [ProcedureCategory.ANORECTAL]: "Anorectal",
  [ProcedureCategory.AORTIC]: "Aórtico",
  [ProcedureCategory.BARIATRIC]: "Bariátrica",
  [ProcedureCategory.BRAIN]: "Neurocirugía (Cerebro)",
  [ProcedureCategory.BREAST]: "Mama",
  [ProcedureCategory.CARDIAC]: "Cardíaca",
  [ProcedureCategory.ENT]: "Otorrinolaringología (ENT)",
  [ProcedureCategory.FOREGUT_HEPATOBILIARY]: "Hepatobiliar / Gástrica",
  [ProcedureCategory.INTESTINAL]: "Intestinal / Colorectal",
  [ProcedureCategory.NECK]: "Cuello (Tiroides/Otras)",
  [ProcedureCategory.OBGYN]: "Ginecología / Obstetricia",
  [ProcedureCategory.ORTHOPEDIC]: "Ortopedia",
  [ProcedureCategory.SPINE]: "Columna",
  [ProcedureCategory.THORACIC]: "Torácica (No Cardíaca)",
  [ProcedureCategory.VASCULAR]: "Vascular Periférico",
  [ProcedureCategory.UROLOGY]: "Urología",
  [ProcedureCategory.OTHER]: "Otro / Menor"
};