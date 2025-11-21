import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, FileText, ShieldCheck, Lock, AlertCircle, Sparkles, Stethoscope, ChevronDown, User, Search, Check } from 'lucide-react';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { MedicalDataService } from '../services/MedicalDataService';
import { MedicalRecord, Patient } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// --- Helpers ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
  return bytes.buffer;
}
async function generateSessionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
async function encryptMessage(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encryptedBuffer)}`;
}
async function decryptMessage(encryptedString: string, key: CryptoKey): Promise<string> {
  try {
    const [ivBase64, dataBase64] = encryptedString.split(':');
    if (!ivBase64 || !dataBase64) throw new Error("Invalid format");
    const iv = base64ToArrayBuffer(ivBase64);
    const data = base64ToArrayBuffer(dataBase64);
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, data);
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) { return "Error: Mensaje bloqueado."; }
}
const EncryptedMessage: React.FC<{ encryptedText: string; cryptoKey: CryptoKey | null }> = ({ encryptedText, cryptoKey }) => {
  const [decryptedText, setDecryptedText] = useState<string>('Decrypting...');
  useEffect(() => {
    let isMounted = true;
    const process = async () => {
      if (!cryptoKey) return;
      const text = await decryptMessage(encryptedText, cryptoKey);
      if (isMounted) setDecryptedText(text);
    };
    process();
    return () => { isMounted = false; };
  }, [encryptedText, cryptoKey]);
  return <div className="relative group"><span>{decryptedText}</span><Lock size={10} className="absolute -top-1 -right-2 text-brand-teal/50 opacity-0 group-hover:opacity-100 transition-opacity" /></div>;
};

const SPECIALTIES = ["Medicina General", "Cardiología", "Pediatría", "Psicología/Psiquiatría", "Ginecología", "Dermatología", "Nutrición"];

const ConsultationView: React.FC = () => {
  const { isListening, transcript, interimTranscript, startListening, stopListening } = useSpeechRecognition();
  
  const [hasConsent, setHasConsent] = useState(false);
  const [specialty, setSpecialty] = useState("Medicina General");
  
  // CRM State (Buscador de Pacientes)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Resultados IA
  const [generatedRecord, setGeneratedRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  
  // Textos Editables
  const [editableSummary, setEditableSummary] = useState(''); 
  const [patientInstructions, setPatientInstructions] = useState(''); // Nueva salida
  
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

  // Lógica de Búsqueda de Pacientes
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
    if (!selectedPatient) {
        if(!confirm("No has seleccionado un paciente. La consulta se guardará como 'Anónimo'. ¿Deseas continuar?")) return;
    }

    setIsLoadingRecord(true);
    setActiveTab('record');
    
    try {
      // 1. Generar las DOS salidas con IA
      const { clinicalNote, patientInstructions } = await GeminiMedicalService.generateSummary(transcript, specialty);
      
      // 2. Guardar en DB
      const patientId = selectedPatient ? selectedPatient.id : '00000000-0000-0000-0000-000000000000';
      
      const newConsultation = await MedicalDataService.createConsultation({
        patient_id: patientId,
        transcript: transcript,
        summary: clinicalNote, // Guardamos la nota técnica
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

    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const sendToWhatsApp = () => {
    // Usamos el teléfono del paciente seleccionado o pedimos uno
    const phone = selectedPatient?.phone || prompt("Ingrese el teléfono del paciente:");
    if (!phone) return;
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(patientInstructions)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Selectors */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Consulta Inteligente</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                {isListening ? '● Grabando' : '● En Espera'}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
            {/* BUSCADOR DE PACIENTES (CRM) */}
            <div className="relative flex-1">
                <div className={`flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm ${selectedPatient ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
                    {selectedPatient ? (
                        <User className="text-green-600 mr-2" size={20} />
                    ) : (
                        <Search className="text-slate-400 mr-2" size={20} />
                    )}
                    
                    <input 
                        type="text"
                        disabled={!!selectedPatient}
                        placeholder={selectedPatient ? selectedPatient.name : "Buscar paciente (ej. Juan Pérez)..."}
                        className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {selectedPatient && (
                        <button onClick={handleClearPatient} className="text-slate-400 hover:text-red-500">
                            <span className="text-xs font-bold">Cambiar</span>
                        </button>
                    )}
                </div>

                {/* Resultados de Búsqueda Flotantes */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {searchResults.map(p => (
                            <div key={p.id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.phone || "Sin teléfono"}</p>
                                </div>
                                <ChevronDown className="-rotate-90 text-slate-300" size={16} />
                            </div>
                        ))}
                    </div>
                )}
                {isSearching && <div className="absolute right-3 top-3"><RefreshCw className="animate-spin text-brand-teal" size={16}/></div>}
            </div>

            {/* SELECTOR ESPECIALIDAD */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm min-w-[200px]">
                <Stethoscope size={18} className="text-brand-teal ml-1" />
                <select 
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer flex-1"
                >
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* IZQUIERDA: GRABACIÓN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
             <input type="checkbox" checked={hasConsent} onChange={(e) => setHasConsent(e.target.checked)} disabled={isListening} className="rounded text-brand-teal cursor-pointer" />
             <span className="text-xs font-medium text-orange-800">Confirmo consentimiento del paciente.</span>
          </div>
          
          <div className="flex-1 p-4 bg-slate-50 overflow-y-auto font-mono text-sm leading-relaxed">
             {transcript ? (
               <><span className="text-slate-800 whitespace-pre-wrap">{transcript}</span><span className="text-slate-400 italic ml-1">{interimTranscript}</span></>
             ) : isListening ? <p className="text-slate-400 italic animate-pulse">Escuchando consulta...</p> : 
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Mic size={40} className="mb-2"/>
                    <p className="text-center text-sm">Seleccione paciente e inicie.</p>
                </div>
             }
             <div ref={transcriptEndRef} />
          </div>
          <div className="p-4 border-t flex gap-3 bg-white">
            <button onClick={handleToggleRecording} disabled={!hasConsent} className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isListening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar</>}
            </button>
            <button onClick={generateRecord} disabled={!transcript || isListening || isLoadingRecord} className="px-4 py-3 bg-brand-teal text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20">
              {isLoadingRecord ? <RefreshCw className="animate-spin" size={20}/> : <Sparkles size={20}/>} Generar
            </button>
          </div>
        </div>

        {/* DERECHA: RESULTADOS CON PESTAÑAS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex border-b bg-slate-50">
            <button onClick={() => setActiveTab('record')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'record' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Expediente</button>
            <button onClick={() => setActiveTab('instructions')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'instructions' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Para Paciente</button>
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'chat' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Chat IA</button>
          </div>
          
          <div className="flex-1 overflow-hidden bg-white flex flex-col">
             {/* TAB: EXPEDIENTE */}
             {activeTab === 'record' && (
               generatedRecord ? (
                   <div className="flex-1 flex flex-col p-0">
                      <textarea 
                        className="flex-1 p-4 text-sm text-slate-700 outline-none resize-none font-mono leading-relaxed"
                        value={editableSummary}
                        onChange={(e) => setEditableSummary(e.target.value)}
                      />
                      <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-center text-slate-400">
                        Nota Clínica Interna (SOAP)
                      </div>
                   </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400"><p className="text-sm">Genere la nota para ver el resultado.</p></div>
               )
             )}

             {/* TAB: INSTRUCCIONES PACIENTE */}
             {activeTab === 'instructions' && (
               generatedRecord ? (
                   <div className="flex-1 flex flex-col p-0">
                      <div className="flex-1 p-4 bg-green-50/50">
                        <textarea 
                            className="w-full h-full bg-transparent outline-none resize-none text-sm text-slate-700 font-medium"
                            value={patientInstructions}
                            onChange={(e) => setPatientInstructions(e.target.value)}
                        />
                      </div>
                      <div className="p-3 border-t border-slate-100 flex items-center gap-3 bg-white">
                        <div className="flex-1 text-xs text-slate-500 truncate">
                            Enviar a: <strong>{selectedPatient?.name || "Paciente"}</strong> ({selectedPatient?.phone || "Sin número"})
                        </div>
                        <button onClick={sendToWhatsApp} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-600 transition-colors">
                            <Send size={16}/> WhatsApp
                        </button>
                      </div>
                   </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400"><p className="text-sm">Aquí aparecerán las indicaciones claras para el paciente.</p></div>
               )
             )}

             {/* TAB: CHAT */}
             {activeTab === 'chat' && (
               <div className="flex flex-col h-full p-4">
                  <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg text-sm max-w-[80%] ${m.role === 'user' ? 'bg-brand-teal text-white' : 'bg-slate-100 text-slate-700'}`}>
                           {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAskAI} className="flex gap-2">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Preguntar..." className="flex-1 p-2 border rounded text-sm"/>
                    <button type="submit" className="bg-slate-900 text-white p-2 rounded"><Send size={16}/></button>
                  </form>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationView;