import React, { useRef, useEffect } from 'react';
import { 
  Mic, Pause, Play, Check, RefreshCw, Save, 
  CornerDownLeft, User, Stethoscope, MessageSquare 
} from 'lucide-react';

interface TranscriptSegment {
    role: 'doctor' | 'patient';
    text: string;
    timestamp: number;
}

interface DictationPanelProps {
  transcript: string;
  setTranscript: (val: string) => void;
  isListening: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  isOnline: boolean;
  isAPISupported: boolean;
  consentGiven: boolean;
  activeSpeaker: 'doctor' | 'patient';
  segments: TranscriptSegment[];
  
  // Acciones
  onToggleRecording: () => void;
  onFinishRecording: () => void;
  onGenerate: () => void;
  onManualSend: () => void;
  onSpeakerSwitch: (role: 'doctor' | 'patient') => void;
  isReadyToGenerate: boolean;
}

export const DictationPanel = React.memo(({
  transcript,
  setTranscript,
  isListening,
  isPaused,
  isProcessing,
  isOnline,
  isAPISupported,
  consentGiven,
  activeSpeaker,
  segments,
  onToggleRecording,
  onFinishRecording,
  onGenerate,
  onManualSend,
  onSpeakerSwitch,
  isReadyToGenerate
}: DictationPanelProps) => {

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para el textarea cuando se dicta
  useEffect(() => { 
    if (isListening && textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript, isListening]);

  // Auto-scroll para el historial de chat
  useEffect(() => { 
      if (transcriptEndRef.current) {
          transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [segments]);

  return (
    <div className={`w-full md:w-1/4 p-4 flex flex-col gap-2 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}>
       {/* --- 1. CHECKBOX DE CONSENTIMIENTO --- */}
       <div className="flex items-center gap-2 p-3 rounded-lg border select-none dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
           <div className={`w-5 h-5 rounded border flex items-center justify-center ${consentGiven ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-slate-700'}`}>
               {consentGiven && <Check size={14}/>}
           </div>
           <label className="text-xs dark:text-white cursor-pointer opacity-80">Consentimiento informado activo.</label>
       </div>
       
       {/* --- 2. ÁREA DE HISTORIAL (CHAD BUBBLES) --- */}
       <div className={`flex-1 flex flex-col p-2 overflow-hidden border rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800 min-h-0`}>
           {segments.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 text-xs">
                   <MessageSquare size={24} className="mb-2"/>
                   <p>El historial aparecerá aquí</p>
               </div>
           ) : (
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                   {segments.map((seg, idx) => (
                       <div key={idx} className={`flex w-full ${seg.role === 'doctor' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1`}>
                           <div className={`max-w-[90%] p-2 rounded-xl text-xs border ${
                               seg.role === 'doctor' 
                               ? 'bg-indigo-100 text-indigo-900 border-indigo-200 rounded-tr-none dark:bg-indigo-900/50 dark:text-indigo-100 dark:border-indigo-800' 
                               : 'bg-white text-slate-700 border-slate-200 rounded-tl-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                           }`}>
                               <p className="whitespace-pre-wrap">{seg.text}</p>
                           </div>
                       </div>
                   ))}
                   <div ref={transcriptEndRef} />
               </div>
           )}
       </div>

       {/* --- 3. ZONA DE ENTRADA Y CONTROLES --- */}
       <div className="flex flex-col gap-2 mt-2 h-[260px] md:h-[35%] shrink-0 border-t dark:border-slate-800 pt-2 pb-2">
           
           {/* Selector de Hablante */}
           <div className="flex justify-between items-center px-1">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrada Activa:</span>
               <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                   <button 
                       onClick={() => onSpeakerSwitch('patient')}
                       className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${activeSpeaker === 'patient' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                       <User size={10}/> Paciente
                   </button>
                   <button 
                       onClick={() => onSpeakerSwitch('doctor')}
                       className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${activeSpeaker === 'doctor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                       <Stethoscope size={10}/> Doctor
                   </button>
               </div>
           </div>

           {/* Área de Texto Activa */}
           <div className={`relative border-2 rounded-xl transition-colors bg-white dark:bg-slate-900 overflow-hidden flex-1 ${isListening ? 'border-red-400 shadow-red-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'}`}>
               {isListening && (
                   <div className="absolute top-2 right-2 flex gap-1 z-10">
                       <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                       <span className="text-[10px] text-red-500 font-bold">GRABANDO</span>
                   </div>
               )}
               <textarea 
                   ref={textareaRef}
                   value={transcript}
                   onChange={(e) => setTranscript(e.target.value)}
                   placeholder={isListening ? "Escuchando..." : "Escribe o dicta aquí..."}
                   className="w-full h-full p-3 bg-transparent resize-none outline-none text-sm dark:text-white"
               />
               {transcript && !isListening && (
                   <button 
                       onClick={onManualSend} 
                       className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors" 
                       title="Agregar al historial"
                   >
                       <CornerDownLeft size={14}/>
                   </button>
               )}
           </div>

           {/* Botones Principales */}
           <div className="flex w-full gap-2 shrink-0">
               <button 
                   onClick={onToggleRecording} 
                   disabled={!consentGiven || (!isAPISupported && !isListening)} 
                   className={`flex-1 py-3 rounded-xl font-bold flex justify-center gap-2 text-white shadow-lg text-sm transition-all ${
                       !isOnline ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' :
                       isListening ? 'bg-amber-500 hover:bg-amber-600' : 
                       isPaused ? 'bg-red-600 hover:bg-red-700' : 
                       'bg-slate-900 hover:bg-slate-800' 
                   }`}
               >
                   {isListening ? (
                       <><Pause size={16} fill="currentColor"/> Pausar</>
                   ) : isPaused ? (
                       <><Play size={16} fill="currentColor"/> Reanudar</>
                   ) : (
                       <><Mic size={16}/> Grabar</>
                   )}
               </button>

               <button 
                   onClick={isListening || isPaused ? onFinishRecording : onGenerate} 
                   disabled={(!transcript && segments.length === 0) || isProcessing} 
                   className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2 disabled:opacity-50 text-sm transition-all ${
                       !isOnline ? 'bg-amber-500 hover:bg-amber-600' : 
                       (isListening || isPaused) ? 'bg-green-600 hover:bg-green-700' : 
                       `bg-brand-teal hover:bg-teal-600 ${isReadyToGenerate ? 'animate-pulse ring-2 ring-teal-300 ring-offset-2 shadow-xl shadow-teal-500/40' : ''}`
                   }`}
               >
                   {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : 
                    (isListening || isPaused) ? <Check size={16}/> : 
                    (isOnline ? <RefreshCw size={16}/> : <Save size={16}/>)
                   } 
                   
                   {isProcessing ? '...' : 
                    (isListening || isPaused) ? 'Terminar' : 
                    (isOnline ? 'Generar' : 'Guardar')
                   }
               </button>
           </div>
       </div>
    </div>
  );
});