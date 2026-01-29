import React, { useState, useEffect } from 'react';
import { 
  X, Activity, AlertTriangle, Info, CheckCircle2, ScrollText, 
  BarChart3, HeartPulse, Scale
} from 'lucide-react';
import { 
  AsaClass, FunctionalStatus, ProcedureCategory, PROCEDURE_LABELS, 
  RiskCalculatorInputs, RiskAssessmentResult 
} from '../../types/RiskModels';
import { RiskCalculatorService } from '../../services/RiskCalculatorService';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientAge: number;
  patientName: string;
  onInsertResult: (textResult: string, rawData: RiskAssessmentResult) => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen, onClose, patientAge, patientName, onInsertResult
}) => {
  // --- ESTADOS ---
  const [inputs, setInputs] = useState<RiskCalculatorInputs>({
    age: patientAge || 0,
    asaClass: 1,
    functionalStatus: FunctionalStatus.INDEPENDENT,
    creatinineGt15: false,
    procedure: ProcedureCategory.OTHER
  });

  const [guptaResult, setGuptaResult] = useState<RiskAssessmentResult | null>(null);
  const [rcriResult, setRcriResult] = useState<{ points: number, estimatedRisk: string } | null>(null);
  const [showFormula, setShowFormula] = useState(false);

  // --- EFECTOS ---
  useEffect(() => {
    setInputs(prev => ({ ...prev, age: patientAge || 0 }));
  }, [patientAge]);

  useEffect(() => {
    calculate();
  }, [inputs]);

  const calculate = () => {
    // 1. Cálculo Gupta
    const gupta = RiskCalculatorService.calculateMICA(inputs);
    setGuptaResult(gupta);

    // 2. Cálculo RCRI (Lee) - Derivado
    // Determinamos si es cirugía de alto riesgo basado en la categoría seleccionada
    const highRiskProcedures = [
        ProcedureCategory.AORTIC, 
        ProcedureCategory.VASCULAR, 
        ProcedureCategory.INTESTINAL, 
        ProcedureCategory.FOREGUT_HEPATOBILIARY,
        ProcedureCategory.THORACIC
    ];
    const isHighRisk = highRiskProcedures.includes(inputs.procedure);
    
    const rcri = RiskCalculatorService.calculateRCRI(inputs, isHighRisk);
    setRcriResult(rcri);
  };

  const handleInsert = () => {
    if (!guptaResult || !rcriResult) return;
    
    const noteText = `
EVALUACIÓN DE RIESGO QUIRÚRGICO (Dual Model)
--------------------------------------------
1. MODELO GUPTA MICA (Cardíaco Perioperatorio):
   - Riesgo: ${guptaResult.riskPercentage}% (${guptaResult.riskLevel})
   
2. MODELO RCRI (Índice de Lee):
   - Puntuación: ${rcriResult.points} puntos
   - Riesgo Estimado: ${rcriResult.estimatedRisk}

3. PARÁMETROS DEL PACIENTE:
   - Edad: ${inputs.age} años | ASA: ${inputs.asaClass}
   - Estado Funcional: ${inputs.functionalStatus}
   - Creatinina >1.5: ${inputs.creatinineGt15 ? 'Sí' : 'No'}
   - Procedimiento: ${PROCEDURE_LABELS[inputs.procedure]}
--------------------------------------------
`.trim();

    onInsertResult(noteText, guptaResult);
    onClose();
  };

  if (!isOpen) return null;

  // --- HELPER VISUAL: BARRA DE PROGRESO ---
  const RiskBar = ({ percentage, thresholds }: { percentage: number, thresholds: [number, number] }) => {
      // Normalizamos el ancho visual (tope 20% para que no se salga de la gráfica si es muy alto)
      const visualWidth = Math.min(percentage * 5, 100); 
      let colorClass = 'bg-emerald-500';
      if (percentage >= thresholds[0]) colorClass = 'bg-amber-500';
      if (percentage >= thresholds[1]) colorClass = 'bg-red-500';

      return (
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1 relative">
              {/* Marcadores de referencia */}
              <div className="absolute left-[5%] top-0 bottom-0 w-[1px] bg-white/50 z-10" title="Umbral Bajo (1%)"/>
              <div className="absolute left-[15%] top-0 bottom-0 w-[1px] bg-white/50 z-10" title="Umbral Alto (3%)"/>
              
              {/* Barra de valor */}
              <div 
                  className={`h-full ${colorClass} transition-all duration-500 ease-out flex items-center justify-end pr-1`} 
                  style={{ width: `${visualWidth}%` }}
              >
                  {visualWidth > 10 && <span className="text-[9px] text-white font-bold">{percentage}%</span>}
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-slate-200 dark:border-slate-700">
        
        {/* === COLUMNA IZQUIERDA: INPUTS (40%) === */}
        <div className="w-full md:w-[40%] flex flex-col min-h-0 bg-slate-50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-700">
          
          {/* HEADER PRINCIPAL */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="text-teal-600" size={20}/> 
                Calculadora Qx
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Datos Clínicos</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
          </div>

          {/* ✅ CORRECCIÓN: ZONA DE DATOS FIJOS (CONTEXTO) */}
          {/* Esta sección ya NO hace scroll, se queda fija arriba */}
          <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 shrink-0">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                   <span className="text-[10px] uppercase font-bold text-slate-400 block">Paciente</span>
                   <span className="font-bold text-slate-700 dark:text-slate-200 truncate block text-sm">{patientName}</span>
                </div>
                <div className={`p-3 rounded-lg border shadow-sm ${inputs.age === 0 ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                   <span className="text-[10px] uppercase font-bold text-slate-400 block">Edad</span>
                   <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{inputs.age} años</span>
                </div>
             </div>
          </div>

          {/* CONTENEDOR SCROLLABLE (SOLO PARA INPUTS) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Aviso de Edad 0 (Mantenido aquí por espacio) */}
            {inputs.age === 0 && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs flex gap-2 items-center border border-red-100 animate-pulse">
                    <AlertTriangle size={16}/>
                    <span><strong>¡Atención!</strong> Edad no detectada. Riesgo subestimado.</span>
                </div>
            )}

            {/* INPUTS: ASA */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Clase ASA</label>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((asa) => (
                  <button
                    key={asa}
                    onClick={() => setInputs(prev => ({ ...prev, asaClass: asa as AsaClass }))}
                    className={`py-2 rounded-md text-xs font-bold border transition-all ${
                      inputs.asaClass === asa 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {asa}
                  </button>
                ))}
              </div>
            </div>

            {/* INPUTS: Estado Funcional */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Estado Funcional</label>
              <div className="space-y-2">
                {[
                  { val: FunctionalStatus.INDEPENDENT, label: 'Independiente' },
                  { val: FunctionalStatus.PARTIALLY_DEPENDENT, label: 'Parcialmente Dependiente' },
                  { val: FunctionalStatus.TOTALLY_DEPENDENT, label: 'Totalmente Dependiente' }
                ].map((opt) => (
                   <button
                    key={opt.val}
                    onClick={() => setInputs(prev => ({ ...prev, functionalStatus: opt.val as any }))}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      inputs.functionalStatus === opt.val
                        ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500 text-teal-700 dark:text-teal-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                    }`}
                   >
                     {opt.label}
                     {inputs.functionalStatus === opt.val && <CheckCircle2 size={14} className="text-teal-600"/>}
                   </button>
                ))}
              </div>
            </div>

            {/* INPUTS: Procedimiento y Lab */}
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Procedimiento</label>
                  <select 
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
                    value={inputs.procedure}
                    onChange={(e) => setInputs(prev => ({...prev, procedure: e.target.value as ProcedureCategory}))}
                  >
                    {Object.entries(PROCEDURE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
               </div>

               <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    checked={inputs.creatinineGt15}
                    onChange={() => setInputs(prev => ({...prev, creatinineGt15: !prev.creatinineGt15}))}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Creatinina {'>'} 1.5 mg/dL</span>
               </label>
            </div>

          </div>
        </div>

        {/* === COLUMNA DERECHA: DASHBOARD DE RESULTADOS (60%) === */}
        <div className="w-full md:w-[60%] bg-white dark:bg-slate-900 flex flex-col">
          <div className="flex-1 p-8 flex flex-col justify-center">
            
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <BarChart3 className="text-indigo-600" /> Análisis de Riesgo Dual
            </h2>

            {/* TARJETA 1: GUPTA MICA */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                    Estándar de Oro
                </div>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <HeartPulse size={16} className="text-pink-500"/> Riesgo Cardíaco (MICA)
                        </h4>
                        <p className="text-[10px] text-slate-400">Infarto o Paro Intra/Post-operatorio</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">{guptaResult?.riskPercentage}%</span>
                        <span className={`block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            guptaResult?.riskLevel === 'Bajo' ? 'bg-emerald-100 text-emerald-700' :
                            guptaResult?.riskLevel === 'Elevado' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {guptaResult?.riskLevel}
                        </span>
                    </div>
                </div>
                {/* BARRA VISUAL */}
                <RiskBar percentage={guptaResult?.riskPercentage || 0} thresholds={[1, 3]} />
                <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-mono">
                    <span>0%</span>
                    <span>1%</span>
                    <span>3% (Alto)</span>
                    <span>+5%</span>
                </div>
            </div>

            {/* TARJETA 2: RCRI (LEE) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 mb-8 flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Scale size={16} className="text-blue-500"/> Índice RCRI (Lee)
                    </h4>
                    <p className="text-[10px] text-slate-400">Evaluación Clínica General</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <span className="block text-xl font-black text-slate-800 dark:text-white">{rcriResult?.points}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Puntos</span>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-600"></div>
                    <div className="text-center">
                        <span className="block text-lg font-bold text-slate-600 dark:text-slate-300">{rcriResult?.estimatedRisk}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Riesgo Est.</span>
                    </div>
                </div>
            </div>

            {/* ACCIONES */}
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowFormula(!showFormula)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    {showFormula ? 'Ocultar Fuentes' : 'Ver Transparencia'}
                </button>
                <button 
                    onClick={handleInsert}
                    className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform hover:-translate-y-1"
                >
                    <ScrollText size={18}/> Insertar en Nota
                </button>
            </div>

            {showFormula && (
              <div className="mt-4 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-[9px] text-slate-500 animate-in fade-in">
                <p><strong>Gupta MICA:</strong> Gupta PK et al. Circulation 2013. (Regresión Logística)</p>
                <p><strong>RCRI:</strong> Lee TH et al. Circulation 1999. (Modelo Aditivo)</p>
              </div>
            )}
          
          </div>

          {/* DISCLAIMER */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800/30">
            <div className="flex gap-2">
              <AlertTriangle className="text-amber-600 shrink-0" size={14} />
              <p className="text-[9px] text-amber-800 dark:text-amber-300 leading-tight text-justify">
                <strong>DESCARGO CLÍNICO:</strong> Herramienta estadística auxiliar. Los porcentajes son estimaciones poblacionales y no sustituyen el juicio clínico individualizado.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};