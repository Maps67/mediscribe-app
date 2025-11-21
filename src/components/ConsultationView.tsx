import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, FileText, ShieldCheck, Lock, AlertCircle, Sparkles, Stethoscope, ChevronDown, User, Search, Bot, Calendar, AlertTriangle, Beaker } from 'lucide-react';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { MedicalDataService } from '../services/MedicalDataService';
import { MedicalRecord, Patient, ActionItems } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// --- Helpers (Seguridad) ---
async function generateSessionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
async function encryptMessage(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
  
  let binary = '';
  const bytes = new Uint8Array(encryptedBuffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const encryptedBase64 = window.btoa(binary);
  
  let ivBinary = '';
  const ivBytes = new Uint8Array(iv);
  for (let i = 0; i < ivBytes.byteLength; i++) ivBinary += String.fromCharCode(ivBytes[i]);
  const ivBase64 = window.btoa(ivBinary);

  return `${ivBase64}:${encryptedBase64}`;
}

const EncryptedMessage: React.FC<{ text: string }> = ({ text }) => {
    return <span>{text}</span>; 
};

const SPECIALTIES = ["Medicina General", "Cardiología", "Pediatría", "Psicología/Psiquiatría", "Ginecología", "Dermatología", "Nutrición"];

const ConsultationView: React.FC = () => {
  const { isListening, transcript, interimTranscript, startListening, stopListening } = useSpeechRecognition();
  
  const [hasConsent, setHasConsent] = useState(false);
  const [specialty, setSpecialty] = useState("Medicina General");
  
  // CRM State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Resultados IA
  const [generatedRecord, setGeneratedRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  
  // Textos Editables y Acciones
  const [editableSummary, setEditableSummary] = useState(''); 
  const [patientInstructions, setPatientInstructions] = useState('');
  const [actionItems, setActionItems] = useState<ActionItems | null>(null); // ESTADO NUEVO
  
  // UI States
  const [activeTab, setActiveTab] = useState<'record' | 'instructions' | 'chat'>('record');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { generateSessionKey().then(setSessionKey); }, []);
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript, interimTranscript]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);

  // Buscador de Pacientes
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 && !selectedPatient) {
        setIsSearching(true);
        const results = await MedicalDataService.searchPatients(searchTerm);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedPatient]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.name);
    setSearchResults([]);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleToggleRecording = () => {
    if (!hasConsent && !isListening) return alert("Debe confirmar el consentimiento de privacidad.");
    isListening ? stopListening() : startListening();
  };

  const generateRecord = async () => {
    if (!transcript) return;
    
    setIsLoadingRecord(true);
    setActiveTab('record');
    
    try {
      // 1. IA Genera (Desestructuramos los 3 valores)
      const { clinicalNote, patientInstructions, actionItems } = await GeminiMedicalService.generateSummary(transcript, specialty);
      
      // 2. Guardar BD
      const patientId = selectedPatient ? selectedPatient.id : '00000000-0000-0000-0000-000000000000';
      
      const newConsultation = await MedicalDataService.createConsultation({
        patient_id: patientId,
        transcript: transcript,
        summary: clinicalNote,
        status: 'completed'
      });

      setGeneratedRecord({
        ...newConsultation,
        subjective: "...",
        objective: "...",
        assessment: "...",
        plan: "..."
      });
      
      setEditableSummary(clinicalNote);
      setPatientInstructions(patientInstructions);
      setActionItems(actionItems); // Guardamos los items de acción

    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const sendToWhatsApp = () => {
    const phone = selectedPatient?.phone || prompt("Ingrese el teléfono del paciente:");
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(patientInstructions)}`;
    window.open(url, '_blank');
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionKey) return;
    
    const q = chatInput;
    setChatInput('');
    
    setChatMessages(p => [...p, { role: 'user', text: q }]);
    setIsChatLoading(true);

    try {
       const response = await GeminiMedicalService.generateSummary(`Contexto Médico: ${transcript}. \n\nPregunta del Doctor: ${q}\n\nResponde breve y conciso.`, specialty);
       const answerText = response.clinicalNote; // Usamos la parte de texto para el chat
       setChatMessages(p => [...p, { role: 'ai', text: answerText }]);
    } catch (e) {
       setChatMessages(p => [...p, { role: 'ai', text: "Error conectando con el asistente." }]);
    } finally { 
       setIsChatLoading(false); 
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      
      {/* Header Fijo */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Consulta Inteligente</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                {isListening ? '● Grabando' : '● En Espera'}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
            {/* Buscador CRM */}
            <div className="relative flex-1">
                <div className={`flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm ${selectedPatient ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
                    {selectedPatient ? <User className="text-green-600 mr-2" size={20} /> : <Search className="text-slate-400 mr-2" size={20} />}
                    <input 
                        type="text"
                        disabled={!!selectedPatient}
                        placeholder={selectedPatient ? selectedPatient.name : "Buscar paciente..."}
                        className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {selectedPatient && (
                        <button onClick={handleClearPatient} className="text-slate-400 hover:text-red-500"><span className="text-xs font-bold">X</span></button>
                    )}
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {searchResults.map(p => (
                            <div key={p.id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                                <div><p className="text-sm font-bold text-slate-700">{p.name}</p></div>
                                <ChevronDown className="-rotate-90 text-slate-300" size={16} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selector */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm min-w-[200px]">
                <Stethoscope size={18} className="text-brand-teal ml-1" />
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer flex-1">
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* Area Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* COLUMNA IZQUIERDA: GRABACIÓN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
          <div className="p-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2 shrink-0">
             <input type="checkbox" checked={hasConsent} onChange={(e) => setHasConsent(e.target.checked)} disabled={isListening} className="rounded text-brand-teal cursor-pointer" />
             <span className="text-xs font-medium text-orange-800">Confirmo consentimiento.</span>
          </div>
          
          <div className="flex-1 p-4 bg-slate-50 overflow-y-auto font-mono text-sm leading-relaxed">
             {transcript ? (
               <><span className="text-slate-800 whitespace-pre-wrap">{transcript}</span><span className="text-slate-400 italic ml-1">{interimTranscript}</span></>
             ) : isListening ? <p className="text-slate-400 italic animate-pulse">Escuchando...</p> : 
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Mic size={40} className="mb-2"/>
                    <p className="text-center text-sm">Listo para iniciar.</p>
                </div>
             }
             <div ref={transcriptEndRef} />
          </div>
          
          <div className="p-4 border-t flex gap-3 bg-white shrink-0">
            <button onClick={handleToggleRecording} disabled={!hasConsent} className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isListening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {isListening ? <><Square size={18}/> Parar</> : <><Mic size={18}/> Iniciar</>}
            </button>
            <button onClick={generateRecord} disabled={!transcript || isListening || isLoadingRecord} className="px-4 py-3 bg-brand-teal text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20">
              {isLoadingRecord ? <RefreshCw className="animate-spin" size={20}/> : <Sparkles size={20}/>} Generar
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESULTADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full relative">
          <div className="flex border-b bg-slate-50 shrink-0">
            <button onClick={() => setActiveTab('record')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'record' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Expediente</button>
            <button onClick={() => setActiveTab('instructions')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'instructions' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Paciente</button>
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'chat' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Chat IA</button>
          </div>
          
          {/* ACTION BOARD (Tablero de Acciones Automáticas) */}
          {generatedRecord && actionItems && (
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                {actionItems.next_appointment && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0">
                    <Calendar size={14} />
                    <div>
                        <p className="uppercase text-[8px] opacity-70">Cita</p>
                        <p className="font-bold">{actionItems.next_appointment}</p>
                    </div>
                </div>
                )}
                {actionItems.urgent_referral && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 animate-pulse">
                    <AlertTriangle size={14} />
                    <span className="font-bold">URGENCIA DETECTADA</span>
                </div>
                )}
                {actionItems.lab_tests_required.length > 0 && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0">
                    <Beaker size={14} />
                    <div>
                        <p className="uppercase text-[8px] opacity-70">Estudios</p>
                        <p className="truncate max-w-[120px] font-bold">{actionItems.lab_tests_required.join(', ')}</p>
                    </div>
                </div>
                )}
            </div>
          )}

          <div className="flex-1 relative bg-white">
             {/* TAB 1: EXPEDIENTE */}
             {activeTab === 'record' && (
                <div className="absolute inset-0 flex flex-col">
                   {generatedRecord ? (
                       <>
                          <textarea 
                            className="flex-1 p-4 text-sm text-slate-700 outline-none resize-none font-mono leading-relaxed"
                            value={editableSummary}
                            onChange={(e) => setEditableSummary(e.target.value)}
                          />
                          <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-center text-slate-400 shrink-0">
                            Nota Clínica Interna (SOAP)
                          </div>
                       </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <FileText size={32} className="mb-2 opacity-20"/>
                        <p className="text-sm">Sin nota generada.</p>
                     </div>
                   )}
                </div>
             )}

             {/* TAB 2: INSTRUCCIONES */}
             {activeTab === 'instructions' && (
               <div className="absolute inset-0 flex flex-col">
                   {generatedRecord ? (
                       <>
                          <div className="flex-1 p-4 bg-green-50/30">
                            <textarea 
                                className="w-full h-full bg-transparent outline-none resize-none text-sm text-slate-700 font-medium"
                                value={patientInstructions}
                                onChange={(e) => setPatientInstructions(e.target.value)}
                            />
                          </div>
                          <div className="p-3 border-t border-slate-100 flex items-center gap-3 bg-white shrink-0">
                            <div className="flex-1 text-xs text-slate-500 truncate">
                                Para: <strong>{selectedPatient?.name || "Paciente"}</strong>
                            </div>
                            <button onClick={sendToWhatsApp} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-600 transition-colors">
                                <Send size={16}/> Enviar
                            </button>
                          </div>
                       </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <User size={32} className="mb-2 opacity-20"/>
                        <p className="text-sm">Sin instrucciones.</p>
                     </div>
                   )}
               </div>
             )}

             {/* TAB 3: CHAT */}
             {activeTab === 'chat' && (
               <div className="absolute inset-0 flex flex-col bg-slate-50">
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg text-sm max-w-[85%] shadow-sm ${m.role === 'user' ? 'bg-brand-teal text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none'}`}>
                           {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <form onSubmit={handleAskAI} className="flex gap-2">
                        <input 
                            value={chatInput} 
                            onChange={e => setChatInput(e.target.value)} 
                            placeholder="Preguntar..." 
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                        />
                        <button type="submit" disabled={!chatInput.trim()} className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                            <Send size={18}/>
                        </button>
                      </form>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationView;