import React, { useState, useEffect } from 'react';
import { X, Activity, Search, Save, Calculator, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface RiskFactors {
  highRiskSurgery: boolean;      
  historyIschemicHeart: boolean; 
  historyCongestiveHeart: boolean; 
  historyCerebrovascular: boolean; 
  insulinDependent: boolean;     
  preopCreatinine: boolean;      
}

interface QuickRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string; 
}

export default function QuickRiskModal({ isOpen, onClose, doctorId }: QuickRiskModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);

  const [factors, setFactors] = useState<RiskFactors>({
    highRiskSurgery: false,
    historyIschemicHeart: false,
    historyCongestiveHeart: false,
    historyCerebrovascular: false,
    insulinDependent: false,
    preopCreatinine: false,
  });
  const [result, setResult] = useState<{ class: string; risk: string; points: number } | null>(null);

  useEffect(() => {
    const searchPatients = async () => {
      if (searchTerm.length < 3) {
        setPatients([]);
        return;
      }
      setIsSearching(true);
      setIsAnonymousMode(false);
      
      try {
        const { data, error } = await supabase
            .from('patients')
            .select('id, name') 
            .ilike('name', `%${searchTerm}%`) 
            .limit(5);

        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error("Error buscando paciente:", err);
      } finally {
        setIsSearching(false);
      }
    };
    
    const timeout = setTimeout(searchPatients, 500); 
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const calculateRisk = () => {
    let score = 0;
    if (factors.highRiskSurgery) score++;
    if (factors.historyIschemicHeart) score++;
    if (factors.historyCongestiveHeart) score++;
    if (factors.historyCerebrovascular) score++;
    if (factors.insulinDependent) score++;
    if (factors.preopCreatinine) score++;

    let riskClass = '';
    let riskPercent = '';

    if (score === 0) { riskClass = 'Clase I'; riskPercent = '0.4% (Bajo)'; }
    else if (score === 1) { riskClass = 'Clase II'; riskPercent = '0.9% (Bajo)'; }
    else if (score === 2) { riskClass = 'Clase III'; riskPercent = '6.6% (Moderado)'; }
    else { riskClass = 'Clase IV'; riskPercent = '>11% (Alto)'; }

    setResult({ class: riskClass, risk: riskPercent, points: score });
  };

  const saveToHistory = async () => {
    if (!selectedPatient || !result) return;
    
    const loadingToast = toast.loading("Guardando valoración...");

    try {
        const factorNames = [
            factors.highRiskSurgery ? "Cirugía Alto Riesgo" : null,
            factors.historyIschemicHeart ? "Cardiopatía Isquémica" : null,
            factors.historyCongestiveHeart ? "Insuficiencia Cardíaca" : null,
            factors.historyCerebrovascular ? "Enf. Cerebrovascular" : null,
            factors.insulinDependent ? "Insulina Dependiente" : null,
            factors.preopCreatinine ? "Creatinina > 2.0" : null
        ].filter(Boolean).join(', ');

        const summary = `Valoración Riesgo Qx: ${result.class} (${result.points} pts) - Riesgo ${result.risk}`;
        const patientDisplayName = selectedPatient.name || "Paciente";

        const { error } = await supabase.from('consultations').insert({
            patient_id: selectedPatient.id,
            doctor_id: doctorId,
            summary: summary, 
            transcript: `[CALCULADORA RIESGO RCRI]\nPac: ${patientDisplayName}\n\nResultado: ${result.class}\nPuntos: ${result.points}\nProbabilidad Complicaciones Cardíacas: ${result.risk}\n\nFactores de Riesgo Presentes:\n${factorNames || "Ninguno (Paciente Sano)"}`,
            status: 'completed',
            created_at: new Date().toISOString(),
            ai_analysis_data: { type: 'surgical_risk', factors, result }
        });

        if (error) throw error;
        
        toast.dismiss(loadingToast);
        toast.success("Valoración guardada en expediente");
        handleClose();

    } catch (error) {
        toast.dismiss(loadingToast);
        console.error(error);
        toast.error("Error al guardar en historial");
    }
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setResult(null);
    setSearchTerm('');
    setPatients([]);
    setIsAnonymousMode(false);
    setFactors({
        highRiskSurgery: false,
        historyIschemicHeart: false,
        historyCongestiveHeart: false,
        historyCerebrovascular: false,
        insulinDependent: false,
        preopCreatinine: false,
    });
    onClose();
  }

  if (!isOpen) return null;

  const showCalculator = selectedPatient || isAnonymousMode;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-rose-600 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold flex items-center gap-2"><Activity/> Calculadora Riesgo Qx (RCRI)</h3>
          <button onClick={handleClose} className="hover:bg-rose-700 p-1 rounded-full"><X/></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* SELECCIÓN DE PACIENTE */}
          {!showCalculator && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">Buscar Paciente para Guardar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                  <input 
                    className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Escribe el nombre..."
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {patients.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-lg mt-2 overflow-hidden max-h-40 overflow-y-auto">
                    {patients.map(p => (
                      <div key={p.id} onClick={() => setSelectedPatient(p)} className="p-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer border-b dark:border-slate-700 last:border-0">
                        <p className="font-bold text-slate-700 dark:text-slate-200">{p.name}</p>
                      </div>
                    ))}
                  </div>
                )}
                {isSearching && <p className="text-xs text-slate-400 text-center py-2">Buscando...</p>}
              </div>

              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">O</span>
                  <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button 
                onClick={() => setIsAnonymousMode(true)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                 <UserX size={18} /> Usar Calculadora Libre (Sin Guardar)
              </button>
            </div>
          )}

          {/* HEADER DE ESTADO */}
          {showCalculator && (
            <div className={`p-3 rounded-xl border flex justify-between items-center ${isAnonymousMode ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-100'}`}>
               <div>
                   <p className="text-xs font-bold uppercase opacity-60">
                     {isAnonymousMode ? 'Modo Calculadora Rápida' : 'Paciente Seleccionado'}
                   </p>
                   <p className="font-bold text-slate-900 dark:text-slate-100">
                     {isAnonymousMode ? 'Sin registro en expediente' : selectedPatient.name}
                   </p>
               </div>
               <button 
                 onClick={() => {
                   setSelectedPatient(null); 
                   setIsAnonymousMode(false); 
                   setResult(null);
                   setSearchTerm('');
                 }} 
                 className="text-xs underline hover:opacity-80 font-bold"
               >
                 Cambiar
               </button>
            </div>
          )}

          {/* CALCULADORA */}
          {showCalculator && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 gap-2">
                  <p className="text-sm font-bold text-slate-500 mb-1">Factores de Riesgo (Marque los presentes)</p>
                  
                  {[
                    { key: 'highRiskSurgery', label: 'Cirugía de Alto Riesgo (Vascular, Torácica, Abdominal)' },
                    { key: 'historyIschemicHeart', label: 'Historia de Cardiopatía Isquémica' },
                    { key: 'historyCongestiveHeart', label: 'Historia de Insuficiencia Cardíaca' },
                    { key: 'historyCerebrovascular', label: 'Historia de Enf. Cerebrovascular (ACV/AIT)' },
                    { key: 'insulinDependent', label: 'Diabetes Insulinodependiente' },
                    { key: 'preopCreatinine', label: 'Creatinina Preoperatoria > 2.0 mg/dL' },
                  ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 p-3 border dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-rose-600 rounded" 
                            checked={factors[item.key as keyof RiskFactors]} 
                            onChange={e => setFactors({...factors, [item.key]: e.target.checked})} 
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                      </label>
                  ))}
               </div>

               <button onClick={calculateRisk} className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold flex justify-center gap-2 transition-colors">
                 <Calculator size={18}/> Calcular Riesgo
               </button>

               {/* RESULTADO */}
               {result && (
                 <div className={`p-4 rounded-xl text-center border-2 ${result.points >= 2 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="text-xs text-slate-500 uppercase font-bold">Índice de Riesgo Cardíaco Revisado</p>
                    <div className={`text-3xl font-black my-2 ${result.points >= 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {result.class}
                    </div>
                    <p className="font-bold text-slate-700 dark:text-slate-800">
                        {result.points} {result.points === 1 ? 'punto' : 'puntos'}
                    </p>
                    <div className="mt-2 text-sm bg-white/50 p-2 rounded-lg">
                        Probabilidad de Complicaciones: <strong>{result.risk}</strong>
                    </div>

                    {/* ✅✅✅ AQUÍ ESTÁ EL TEXTO LEGAL QUE QUERÍAS ✅✅✅ */}
                    <div className="mt-6 border-t border-slate-200 pt-4">
                      <p className="text-[10px] text-slate-400 text-justify leading-relaxed">
                        <span className="font-bold text-slate-500">FUENTE:</span> RCRI (Revised Cardiac Risk Index): Lee TH et al. <em>Circulation</em> 1999; 100:1043-1049. Validado por Guías ACC/AHA 2014.
                      </p>
                      <p className="text-[10px] text-slate-400 text-justify leading-relaxed mt-2">
                        <span className="font-bold text-slate-500">DESCARGO CLÍNICO:</span> Herramienta estadística auxiliar. Los porcentajes provienen de la cohorte de validación original y no sustituyen el juicio clínico individualizado.
                      </p>
                    </div>

                 </div>
               )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950">
           {isAnonymousMode ? (
             <p className="text-xs text-slate-400 italic w-full text-center">
               Modo Libre: El resultado no se guardará.
             </p>
           ) : (
             <button 
               onClick={saveToHistory}
               disabled={!result || !selectedPatient}
               className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all"
             >
               <Save size={18}/> Guardar en Expediente
             </button>
           )}
        </div>

      </div>
    </div>
  );
}