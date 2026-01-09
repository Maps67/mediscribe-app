import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Edit3, FileText, Shield, X } from 'lucide-react';
import { Patient, PatientInsight, GeminiResponse } from '../../types';

interface Props {
  patient: Patient;
  // Datos opcionales que pueden venir del dashboard
  lastInsight?: PatientInsight | null;
  // Callback para devolver el control al padre
  onComplete: (manualContext: string) => void;
  onCancel: () => void;
}

export const PatientBriefing: React.FC<Props> = ({ patient, lastInsight, onComplete, onCancel }) => {
  // Detectamos si es paciente "nuevo" (sin historial sustancial)
  const hasHistory = patient.history && patient.history.length > 50; 
  const isNewPatient = !hasHistory && !(patient as any).last_consultation;

  const [manualContext, setManualContext] = useState("");
  const [step, setStep] = useState<'briefing' | 'writing'>('briefing');

  // Si es nuevo, pasamos directo a escritura
  useEffect(() => {
    if (isNewPatient) setStep('writing');
  }, [isNewPatient]);

  const handleConfirm = () => {
    onComplete(manualContext);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b dark:border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {isNewPatient ? <Edit3 size={20} className="text-indigo-500"/> : <Activity size={20} className="text-teal-500"/>}
              {isNewPatient ? "Contexto Inicial" : "Pase de Visita"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {patient.name} • {calculateAge((patient as any).birthdate)}
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* MODO LECTURA (Pacientes Recurrentes) */}
          {!isNewPatient && step === 'briefing' && (
            <div className="space-y-6">
               {/* 1. Alertas / Banderas Rojas */}
               {lastInsight?.risk_flags && lastInsight.risk_flags.length > 0 ? (
                 <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
                   <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                     <AlertTriangle size={14}/> Alertas Críticas
                   </h4>
                   <ul className="space-y-1">
                     {lastInsight.risk_flags.map((flag, i) => (
                       <li key={i} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                         <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full shrink-0"/> {flag}
                       </li>
                     ))}
                   </ul>
                 </div>
               ) : (
                 <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 flex items-center gap-3">
                    <Shield size={18} className="text-green-600 dark:text-green-400"/>
                    <span className="text-sm text-green-800 dark:text-green-200 font-medium">Sin alertas de riesgo detectadas.</span>
                 </div>
               )}

               {/* 2. Evolución (The Headline) */}
               <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Clock size={14}/> Última Evolución
                 </h4>
                 <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                   <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                     {lastInsight?.evolution || (patient.history ? cleanHistoryPreview(patient.history) : "Sin resumen de evolución disponible.")}
                   </p>
                 </div>
               </div>

               {/* 3. Botón para agregar contexto manual si algo cambió */}
               <button 
                 onClick={() => setStep('writing')}
                 className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-2"
               >
                 <Edit3 size={12}/> Quiero agregar un contexto nuevo para hoy
               </button>
            </div>
          )}

          {/* MODO ESCRITURA (Pacientes Nuevos o Actualización) */}
          {step === 'writing' && (
            <div className="animate-in slide-in-from-right duration-300">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                ¿Cuál es el motivo principal de la consulta hoy?
              </label>
              <textarea
                autoFocus
                className="w-full h-32 p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm text-base"
                placeholder="Ej: Paciente masculino 45 años, refiere dolor precordial intenso desde hace 2 horas. Antecedentes de tabaquismo..."
                value={manualContext}
                onChange={(e) => setManualContext(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <FileText size={12}/> Este texto servirá como "guía" para que la IA inicie la nota con precisión.
              </p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex gap-3">
          {step === 'writing' && !isNewPatient && (
            <button 
              onClick={() => setStep('briefing')}
              className="px-4 py-2 text-slate-500 font-medium text-sm hover:text-slate-700"
            >
              Volver
            </button>
          )}
          
          <button 
            onClick={handleConfirm}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
          >
            {step === 'briefing' ? (
               <>Entendido, Iniciar <CheckCircle size={18}/></>
            ) : (
               <>Guardar Contexto e Iniciar <CheckCircle size={18}/></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

// Helpers simples para visualización
function calculateAge(dob: string) {
    if(!dob) return "";
    try {
        const diff = Date.now() - new Date(dob).getTime();
        const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
        return `${age} años`;
    } catch { return ""; }
}

function cleanHistoryPreview(history: any) {
    if (typeof history === 'string') return history.substring(0, 150) + "...";
    return "Historial estructurado disponible.";
}