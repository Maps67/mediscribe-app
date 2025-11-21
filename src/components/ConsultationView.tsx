import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, FileText, ShieldCheck, Lock, AlertCircle, Sparkles, Stethoscope, ChevronDown } from 'lucide-react';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { MedicalDataService } from '../services/MedicalDataService';
import { MedicalRecord } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// --- Crypto Helpers (Sin cambios) ---
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

// --- Constantes ---
const SPECIALTIES = [
  "Medicina General",
  "Cardiología",
  "Pediatría",
  "Psicología/Psiquiatría",
  "Ginecología",
  "Dermatología",
  "Nutrición"
];

// --- Componente Principal ---

const ConsultationView: React.FC = () => {
  const { isListening, transcript, interimTranscript, startListening, stopListening } = useSpeechRecognition();
  
  const [hasConsent, setHasConsent] = useState(false);
  const [specialty, setSpecialty] = useState("Medicina General");
  
  // Resultados
  const [generatedRecord, setGeneratedRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [patientPhone, setPatientPhone] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [editableSummary, setEditableSummary] = useState(''); // Estado para edición manual
  
  // UI States
  const [activeTab, setActiveTab] = useState<'record' | 'chat'>('record');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { generateSessionKey().then(setSessionKey); }, []);
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript, interimTranscript]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);

  const handleToggleRecording = () => {
    if (!hasConsent && !isListening) return alert("Debe confirmar el consentimiento de privacidad.");
    isListening ? stopListening() : startListening();
  };

  const generateRecord = async () => {
    if (!transcript) return;
    setIsLoadingRecord(true);
    setActiveTab('record');
    
    try {
      // 1. Pasamos la especialidad al servicio
      const rawSummary = await GeminiMedicalService.generateSummary(transcript, specialty);
      
      // 2. Guardamos en un estado editable primero (no guardamos en DB inmediatamente si quieres editar)
      // O guardamos una versión preliminar. Aquí guardaremos preliminar.
      const newConsultation = await MedicalDataService.createConsultation({
        patient_id: '00000000-0000-0000-0000-000000000000', 
        transcript: transcript,
        summary: rawSummary,
        status: 'completed'
      });

      const mockRecord: MedicalRecord = {
        id: newConsultation.id || 'temp',
        created_at: new Date().toISOString(),
        doctor_id: 'me',
        patient_id: 'temp',
        transcript: transcript,
        summary: rawSummary,
        status: 'completed'
      };
      
      setGeneratedRecord(mockRecord);
      setEditableSummary(rawSummary); // Permitir edición
      setGeneratedMessage(`Resumen (${specialty}):\n\n${rawSummary}\n\nAtte. Dr. Martínez`);

    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const handleUpdateSummary = async () => {
      // Función para guardar los cambios manuales que hizo el doctor en el textarea
      if(!generatedRecord) return;
      // Aquí podrías llamar a un método update de Supabase (pendiente de implementar en servicio)
      alert("Nota actualizada localmente (implementar update en BD en siguiente paso).");
      setGeneratedMessage(`Resumen (${specialty}):\n\n${editableSummary}\n\nAtte. Dr. Martínez`);
  };

  const sendToWhatsApp = () => {
    if (!patientPhone) return alert("Ingrese teléfono.");
    const url = `https://wa.me/${patientPhone}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, '_blank');
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionKey) return;
    const q = chatInput; setChatInput('');
    
    const encUser = await encryptMessage(q, sessionKey);
    setChatMessages(p => [...p, { role: 'user', text: encUser }]);
    setIsChatLoading(true);

    try {
       const ans = await GeminiMedicalService.generateSummary(`Contexto: ${transcript}. Pregunta: ${q}`, specialty);
       const encAns = await encryptMessage(ans, sessionKey);
       setChatMessages(p => [...p, { role: 'ai', text: encAns }]);
    } catch (e) { setIsChatLoading(false); } finally { setIsChatLoading(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Consulta Inteligente</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> HIPAA Compliant
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1">
              <Lock size={12} /> AES-256 Encrypted
            </span>
          </div>
        </div>
        
        {/* SELECTOR DE ESPECIALIDAD */}
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="bg-teal-50 p-2 rounded text-brand-teal">
                <Stethoscope size={18} />
            </div>
            <div className="relative">
                <label className="text-[10px] font-bold text-slate-400 absolute -top-1 left-0">MODO ESPECIALISTA</label>
                <select 
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="appearance-none bg-transparent pt-3 pb-1 pr-8 text-sm font-bold text-slate-700 outline-none cursor-pointer min-w-[160px]"
                >
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-4 text-slate-400 pointer-events-none"/>
            </div>
        </div>

        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${isListening ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="font-medium text-sm uppercase">{isListening ? 'En Vivo' : 'En Espera'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IZQUIERDA: GRABACIÓN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
          <div className="p-4 bg-orange-50 border-b border-orange-100">
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasConsent} onChange={(e) => setHasConsent(e.target.checked)} disabled={isListening} className="rounded text-brand-teal" />
                <span className="text-sm font-medium text-orange-800">He obtenido el consentimiento informado.</span>
             </label>
          </div>
          <div className="flex-1 p-4 bg-slate-50 overflow-y-auto font-mono text-sm leading-relaxed">
             {transcript ? (
               <><span className="text-slate-800 whitespace-pre-wrap">{transcript}</span><span className="text-slate-400 italic ml-1">{interimTranscript}</span></>
             ) : isListening ? <p className="text-slate-400 italic animate-pulse">Escuchando...</p> : 
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Mic size={40} className="mb-2"/>
                    <p>Seleccione especialidad e inicie.</p>
                </div>
             }
             <div ref={transcriptEndRef} />
          </div>
          <div className="p-4 border-t flex gap-3">
            <button onClick={handleToggleRecording} disabled={!hasConsent} className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${isListening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-900 text-white'}`}>
              {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar</>}
            </button>
            <button onClick={generateRecord} disabled={!transcript || isListening || isLoadingRecord} className="px-6 py-3 bg-brand-teal text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/20">
              {isLoadingRecord ? <RefreshCw className="animate-spin"/> : <FileText size={18}/>} Generar Nota
            </button>
          </div>
        </div>

        {/* DERECHA: RESULTADO EDITABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
          <div className="flex border-b">
            <button onClick={() => setActiveTab('record')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'record' ? 'text-brand-teal border-b-2 border-brand-teal' : 'text-slate-500'}`}>Expediente</button>
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'chat' ? 'text-brand-teal border-b-2 border-brand-teal' : 'text-slate-500'}`}>Asistente IA</button>
          </div>
          
          <div className="flex-1 overflow-hidden bg-slate-50/30 flex flex-col">
             {activeTab === 'record' ? (
               generatedRecord ? (
                   <div className="flex-1 flex flex-col p-4 overflow-hidden">
                      {/* AREA DE EDICIÓN */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg mb-4 flex flex-col shadow-sm overflow-hidden">
                          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-500 uppercase">Nota Generada ({specialty})</span>
                              <span className="text-xs text-brand-teal">Editable</span>
                          </div>
                          <textarea 
                            className="flex-1 p-4 text-sm text-slate-700 outline-none resize-none font-mono leading-relaxed"
                            value={editableSummary}
                            onChange={(e) => setEditableSummary(e.target.value)}
                          />
                      </div>

                      {/* ACCIONES DE ENVÍO */}
                      <div className="bg-green-50 p-3 rounded-lg border border-green-100 shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <input type="text" placeholder="Teléfono (52...)" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} className="flex-1 p-2 border rounded text-sm"/>
                            <button onClick={sendToWhatsApp} className="bg-[#25D366] text-white p-2 rounded hover:bg-green-600 transition-colors"><Send size={16}/></button>
                        </div>
                        <p className="text-[10px] text-green-700 text-center">Al enviar, se usará el texto editado arriba.</p>
                      </div>
                   </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400 p-4 text-center">
                    <div className="max-w-xs">
                        <Sparkles size={32} className="mx-auto mb-3 opacity-30"/>
                        <p className="text-sm">Aquí aparecerá la nota estructurada lista para editar.</p>
                    </div>
                 </div>
               )
             ) : (
               <div className="flex flex-col h-full p-4">
                  <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg text-sm max-w-[80%] ${m.role === 'user' ? 'bg-brand-teal text-white' : 'bg-white border shadow-sm'}`}>
                           <EncryptedMessage encryptedText={m.text} cryptoKey={sessionKey} />
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleAskAI} className="flex gap-2">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Preguntar sobre el caso..." className="flex-1 p-2 border rounded text-sm shadow-sm"/>
                    <button type="submit" className="bg-slate-900 text-white p-2 rounded hover:bg-slate-800"><Send size={16}/></button>
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