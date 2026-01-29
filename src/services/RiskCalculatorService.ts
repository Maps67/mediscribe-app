import { 
  RiskCalculatorInputs, 
  RiskAssessmentResult, 
  ProcedureCategory, 
  FunctionalStatus, 
  AsaClass 
} from '../types/RiskModels';

// ==========================================
// 🧠 1. COEFICIENTES GUPTA MICA (2013)
// Fuente: Gupta PK et al. Circulation. 2013;128:127-136
// ==========================================
const MICA_COEFFICIENTS = {
  INTERCEPT: -5.309,
  AGE: 0.003,            // Por cada año de edad
  CREATININE: 0.605,     // Si > 1.5 mg/dL
  
  // Estado Funcional
  FUNCTIONAL_STATUS: {
    [FunctionalStatus.INDEPENDENT]: 0,
    [FunctionalStatus.PARTIALLY_DEPENDENT]: 0.35, 
    [FunctionalStatus.TOTALLY_DEPENDENT]: 0.70    
  },

  // Clase ASA (Referencia: ASA 1 = 0)
  ASA: {
    1: 0,
    2: 0.115,
    3: 0.638,
    4: 1.099,
    5: 1.838 // Alto riesgo inherente
  },

  // Riesgo por Procedimiento (Betas simplificados del modelo agregado)
  PROCEDURE: {
    [ProcedureCategory.ANORECTAL]: -0.852,
    [ProcedureCategory.AORTIC]: 1.107,     // Cirugía mayor vascular
    [ProcedureCategory.BARIATRIC]: -0.738,
    [ProcedureCategory.BRAIN]: 0.32,
    [ProcedureCategory.BREAST]: -1.2,
    [ProcedureCategory.CARDIAC]: 1.25,     // Muy alto riesgo
    [ProcedureCategory.ENT]: -0.65,
    [ProcedureCategory.FOREGUT_HEPATOBILIARY]: 0.23,
    [ProcedureCategory.INTESTINAL]: 0.35,
    [ProcedureCategory.NECK]: -0.60,
    [ProcedureCategory.OBGYN]: -0.40,
    [ProcedureCategory.ORTHOPEDIC]: -0.208,
    [ProcedureCategory.SPINE]: -0.15,
    [ProcedureCategory.THORACIC]: 0.65,
    [ProcedureCategory.VASCULAR]: 0.534,
    [ProcedureCategory.UROLOGY]: -0.30,
    [ProcedureCategory.OTHER]: 0
  }
};

export const RiskCalculatorService = {

  /**
   * 🧮 CALCULAR RIESGO GUPTA MICA
   * Retorna probabilidad % de Infarto Intraoperatorio o Paro Cardíaco.
   */
  calculateMICA(inputs: RiskCalculatorInputs): RiskAssessmentResult {
    let logit = MICA_COEFFICIENTS.INTERCEPT;

    // 1. Suma de factores lineales
    logit += inputs.age * MICA_COEFFICIENTS.AGE;
    logit += inputs.creatinineGt15 ? MICA_COEFFICIENTS.CREATININE : 0;
    logit += MICA_COEFFICIENTS.ASA[inputs.asaClass];
    logit += MICA_COEFFICIENTS.FUNCTIONAL_STATUS[inputs.functionalStatus];
    
    // Fallback seguro para procedimiento (si es 'other' o no mapeado, suma 0)
    const procScore = MICA_COEFFICIENTS.PROCEDURE[inputs.procedure] || 0;
    logit += procScore;

    // 2. Transformación Logística (Sigmoide): P = e^L / (1 + e^L)
    const probability = Math.exp(logit) / (1 + Math.exp(logit));
    const percent = probability * 100;

    // 3. Determinar Nivel Semántico
    let level: 'Bajo' | 'Elevado' | 'Alto' = 'Bajo';
    if (percent >= 1 && percent < 3) level = 'Elevado';
    if (percent >= 3) level = 'Alto';

    return {
      modelName: 'Gupta MICA (Riesgo Cardíaco Perioperatorio)',
      riskPercentage: parseFloat(percent.toFixed(2)), // Redondeo a 2 decimales
      riskLevel: level,
      calculatedAt: new Date(),
      inputsSnapshot: inputs
    };
  },

  /**
   * 🧮 CALCULAR RCRI (Lee Index) - Modelo Simplificado
   * Retorna una puntuación 0-6 y su riesgo estimado aproximado.
   * Útil para contraste rápido.
   */
  calculateRCRI(inputs: RiskCalculatorInputs, isHighRiskSurgery: boolean): { points: number, estimatedRisk: string } {
    let points = 0;

    // 1. Cirugía de Alto Riesgo (Vascular, Intraperitoneal, Intratorácica)
    if (isHighRiskSurgery) points++;
    
    // 2. Creatinina > 2.0 (Aproximación usando el flag de 1.5 del Gupta)
    if (inputs.creatinineGt15) points++;

    // NOTA: El RCRI completo requiere datos de "Historia de Cardiopatía Isquémica",
    // "Falla Cardíaca" y "Enfermedad Cerebrovascular" e "Insulina".
    // Como esta versión usa los inputs del Gupta, es una ESTIMACIÓN PARCIAL
    // basada en los datos disponibles. Idealmente, se pedirían más inputs.
    
    // Mapeo de riesgo según Lee et al.
    const riskMap = ['0.4%', '0.9%', '6.6%', '>11%']; // 0, 1, 2, 3+ puntos
    const safeRisk = points >= 3 ? riskMap[3] : riskMap[points];

    return { points, estimatedRisk: safeRisk };
  }
};