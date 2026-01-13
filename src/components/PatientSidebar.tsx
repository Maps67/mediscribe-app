import React, { useMemo } from 'react';
import { 
  Search, X, UserPlus, WifiOff, Trash2, Paperclip, 
  ChevronDown, ChevronUp, Activity, Stethoscope, Calendar 
} from 'lucide-react';
import { Patient, PatientInsight } from '../types';
import { VitalSnapshotCard } from './VitalSnapshotCard';
// 1. IMPORTAMOS EL COMPONENTE NUEVO
import { SpecialtyVault } from './SpecialtyVault';

interface PatientSidebarProps {
  patients: any[];
  selectedPatient: Patient | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectPatient: (patient: any) => void;
  onCreateTemporary: (name: string) => void;
  onClearTranscript: () => void;
  onOpenAttachments: () => void;
  hasTranscript: boolean;
  isOnline: boolean;
  selectedSpecialty: string;
  specialties: string[];
  onSpecialtyChange: (val: string) => void;
  
  // Props de Vital Snapshot
  vitalSnapshot: PatientInsight | null;
  loadingSnapshot: boolean;
  isMobileSnapshotVisible: boolean;
  setIsMobileSnapshotVisible: (val: boolean) => void;
  
  // Props de Contexto Médico
  activeMedicalContext: any;
  isMobileContextExpanded: boolean;
  setIsMobileContextExpanded: (val: boolean) => void;
  onLoadInsights: () => void;
  isLoadingInsights: boolean;
}

export const PatientSidebar = React.memo(({
  patients,
  selectedPatient,
  searchTerm,
  setSearchTerm,
  onSelectPatient,
  onCreateTemporary,
  onClearTranscript,
  onOpenAttachments,
  hasTranscript,
  isOnline,
  selectedSpecialty,
  specialties,
  onSpecialtyChange,
  vitalSnapshot,
  loadingSnapshot,
  isMobileSnapshotVisible,
  setIsMobileSnapshotVisible,
  activeMedicalContext,
  isMobileContextExpanded,
  setIsMobileContextExpanded,
  onLoadInsights,
  isLoadingInsights
}: PatientSidebarProps) => {

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  return (
    <div className={`w-full md:w-1/4 p-4 flex flex-col gap-2 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden h-full`}>
        {/* HEADER */}
        <div className="flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                Consulta IA
                <button onClick={onOpenAttachments} className="p-2 ml-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 transition-colors" title="Ver archivos adjuntos"><Paperclip size={18} /></button>
            </h2>
            <div className="flex gap-2">
                {!isOnline && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex items-center gap-1 animate-pulse"><WifiOff size={12}/> Offline</span>}
                {hasTranscript && <button onClick={onClearTranscript} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>}
            </div>
        </div>

        {/* SELECTOR DE ESPECIALIDAD */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 shrink-0">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex gap-1"><Stethoscope size={14}/> Especialidad</label>
            </div>
            <select value={selectedSpecialty} onChange={(e)=>onSpecialtyChange(e.target.value)} className="w-full bg-transparent border-b border-indigo-200 outline-none py-1 text-sm dark:text-white cursor-pointer">
                {specialties.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
        </div>

        {/* BUSCADOR DE PACIENTES */}
        <div className="relative z-10 shrink-0">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <Search className="text-slate-400 mr-2" size={18}/><input placeholder="Buscar paciente..." className="w-full bg-transparent outline-none dark:text-white text-sm" value={selectedPatient?selectedPatient.name:searchTerm} onChange={(e)=>{setSearchTerm(e.target.value); if(selectedPatient) onSelectPatient(null);}}/>
                {selectedPatient && <button onClick={()=>{onSelectPatient(null); setSearchTerm('')}}><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border rounded-b-lg shadow-lg z-40 max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                        <div key={p.id} onClick={() => onSelectPatient(p)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 dark:text-white text-sm flex items-center justify-between">
                            <span>{p.name}</span>
                            {p.isGhost && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar size={10}/> Cita sin registro</span>}
                        </div>
                    ))}
                    {filteredPatients.length === 0 && (
                        <div onClick={() => onCreateTemporary(searchTerm)} className="p-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer border-b dark:border-slate-700 text-brand-teal font-bold text-sm flex items-center gap-2">
                            <UserPlus size={16}/>
                            <span>Crear Nuevo: "{searchTerm}"</span>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
            
            {/* VITAL SNAPSHOT CARD */}
            <div className="w-full transition-all duration-300 ease-in-out">
                {vitalSnapshot && (
                   <div className="md:hidden flex justify-between items-center mb-2 px-1">
                       <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                           <Activity size={12}/> Contexto Vital
                       </span>
                       <button onClick={() => setIsMobileSnapshotVisible(!isMobileSnapshotVisible)} className="p-1 bg-slate-200 rounded text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                           {isMobileSnapshotVisible ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                       </button>
                   </div>
                )}

                <div className={`${!isMobileSnapshotVisible ? 'hidden' : 'block'} md:block md:max-h-none max-h-[55vh]`}>
                    <VitalSnapshotCard insight={vitalSnapshot} isLoading={loadingSnapshot} />
                    {vitalSnapshot && (
                        <button onClick={()=>setIsMobileSnapshotVisible(false)} className="md:hidden w-full mt-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                            <ChevronUp size={12}/> Ocultar
                        </button>
                    )}
                </div>
            </div>

            {/* 2. AQUÍ INTEGRAMOS LA BÓVEDA DE ESPECIALIDAD */}
            {selectedPatient && !(selectedPatient as any).isTemporary && (
                <div className="mt-2">
                    <SpecialtyVault 
                        patientId={selectedPatient.id} 
                        specialty={selectedSpecialty} 
                    />
                </div>
            )}

        </div>

        {/* BOTÓN ANÁLISIS 360 - Footer Fijo */}
        {selectedPatient && !(selectedPatient as any).isTemporary && (
            <div className="mt-auto pt-2 shrink-0">
                <button 
                    onClick={onLoadInsights} 
                    disabled={isLoadingInsights}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
                >
                    <span>Análisis Clínico 360°</span>
                </button>
            </div>
        )}
    </div>
  );
});