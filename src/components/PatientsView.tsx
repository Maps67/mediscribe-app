import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Calendar, User, X, Save, FileText, ChevronLeft, Clock, Trash2, Printer, Send, RefreshCw, Mic, Square, PenTool, Share2, Image as ImageIcon, UploadCloud, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';
import FormattedText from './FormattedText';
import { pdf } from '@react-pdf/renderer'; 
import PrescriptionPDF from './PrescriptionPDF';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { useLocation } from 'react-router-dom'; // IMPORTANTE: Necesario para recibir la orden del Dashboard

const PatientsView: React.FC = () => {
  // --- ESTADOS ---
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorProfile, setDoctorProfile] = useState<any>({});

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detalle
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'files'>('history');
  const [history, setHistory] = useState<Consultation[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Lógica Voz y Archivos
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const [rxText, setRxText] = useState('');
  const [isProcessingRx, setIsProcessingRx] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // HOOK DE UBICACIÓN PARA DETECTAR NAVEGACIÓN DESDE DASHBOARD
  const location = useLocation();

  useEffect(() => { fetchPatients(); fetchProfile(); }, []);

  // NUEVO EFECTO: ESCUCHA SI HAY UN ID DE PACIENTE EN LA NAVEGACIÓN
  useEffect(() => {
    if (!loading && patients.length > 0 && location.state && (location.state as any).openPatientId) {
        const patientIdToOpen = (location.state as any).openPatientId;
        const foundPatient = patients.find(p => p.id === patientIdToOpen);
        
        if (foundPatient) {
            handlePatientSelect(foundPatient);
            // Limpiamos el estado para que no se vuelva a abrir al recargar (opcional, pero buena práctica)
            window.history.replaceState({}, document.title);
        }
    }
  }, [loading, patients, location.state]);

  const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) { const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single(); setDoctorProfile(data || {}); }
  };
  const fetchPatients = async () => {
      const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      setPatients(data || []); setLoading(false);
  };
  const fetchDetails = async (id: string) => {
      const { data: hist } = await supabase.from('consultations').select('*').eq('patient_id', id).order('created_at', { ascending: false });
      setHistory(hist || []);
      const { data: docs } = await supabase.from('patient_documents').select('*').eq('patient_id', id).order('created_at', { ascending: false });
      // Mapeo de URLs firmadas simplificado
      if(docs) {
          const signedDocs = await Promise.all(docs.map(async d => {
             let path = d.file_url.includes('patient-files/') ? d.file_url.split('patient-files/')[1] : d.file_url;
             const { data } = await supabase.storage.from('patient-files').createSignedUrl(path, 3600);
             return { ...d, signedUrl: data?.signedUrl };
          }));
          setDocuments(signedDocs);
      }
  };

  const handlePatientSelect = (p: Patient) => { setSelectedPatient(p); fetchDetails(p.id); setActiveTab('history'); };
  
  const handleCreatePatient = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('patients').insert([{ name: newPatientName, phone: newPatientPhone, doctor_id: user?.id }]);
      setIsSaving(false); setIsModalOpen(false); fetchPatients();
  };

  const handleRxGenerate = async () => {
      if(!transcript) return; setIsProcessingRx(true);
      try { const txt = await GeminiMedicalService.generatePrescriptionOnly(transcript); setRxText(txt); } 
      catch(e) { alert("Error"); } finally { setIsProcessingRx(false); stopListening(); }
  };

  const handleRxSave = async () => {
     if(!selectedPatient) return;
     const { data: { user } } = await supabase.auth.getUser();
     await supabase.from('consultations').insert([{ doctor_id: user?.id, patient_id: selectedPatient.id, transcript: "VOZ: "+transcript, summary: rxText, status: 'completed' }]);
     setIsRxModalOpen(false); fetchDetails(selectedPatient.id);
  };

  const handleUpload = async (e: any) => {
     if(!e.target.files[0] || !selectedPatient) return;
     const file = e.target.files[0]; const ext = file.name.split('.').pop(); const name = `${selectedPatient.id}/${Date.now()}.${ext}`;
     const { data } = await supabase.storage.from('patient-files').upload(name, file);
     if(data) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('patient_documents').insert([{ doctor_id: user?.id, patient_id: selectedPatient.id, name: newDocName || 'Estudio', file_url: data.path, file_type: file.type.includes('image') ? 'image':'file' }]);
        fetchDetails(selectedPatient.id); setIsUploadModalOpen(false);
     }
  };

  const handlePDF = async (consultation: Consultation, mode: 'print' | 'share') => {
      setGeneratingPdfId(consultation.id);
      try {
        const blob = await pdf(<PrescriptionPDF doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty} license={doctorProfile.license_number} phone={doctorProfile.phone} university={doctorProfile.university} address={doctorProfile.address} logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} patientName={selectedPatient!.name} date={new Date(consultation.created_at).toLocaleDateString()} content={consultation.summary || ""} />).toBlob();
        const file = new File([blob], "Receta.pdf", { type: 'application/pdf' });
        if(mode === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Receta' });
        } else {
            const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'Receta.pdf'; link.click();
        }
      } catch(e) { console.log(e); } finally { setGeneratingPdfId(null); }
  };

  // --- VISTAS ---
  if (selectedPatient) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex justify-between mb-6">
            <button onClick={() => setSelectedPatient(null)} className="flex gap-2 text-slate-500"><ChevronLeft /> Volver</button>
            <button onClick={() => {setRxText(''); setIsRxModalOpen(true);}} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex gap-2"><PenTool size={18}/> Receta Rápida</button>
        </div>
        
        <div className="bg-white p-6 rounded-xl border mb-6 flex justify-between items-center">
            <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xl font-bold">{selectedPatient.name.charAt(0)}</div>
                <div><h2 className="text-2xl font-bold">{selectedPatient.name}</h2><p className="text-slate-500 text-sm">{selectedPatient.phone}</p></div>
            </div>
        </div>

        <div className="flex border-b mb-6">
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 border-b-2 ${activeTab==='history'?'border-teal-500 text-teal-600':'border-transparent'}`}>Historial</button>
            <button onClick={() => setActiveTab('files')} className={`px-6 py-3 border-b-2 ${activeTab==='files'?'border-teal-500 text-teal-600':'border-transparent'}`}>Estudios</button>
        </div>

        {activeTab === 'history' && (
            <div className="space-y-4">
                {history.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="flex justify-between border-b pb-2 mb-2"><span className="font-bold text-slate-700">{new Date(c.created_at).toLocaleDateString()}</span><span className="text-xs bg-green-100 text-green-800 px-2 rounded">Completada</span></div>
                        <FormattedText content={c.summary || ''} />
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                            <button onClick={() => handlePDF(c, 'share')} disabled={generatingPdfId===c.id} className="bg-teal-600 text-white px-3 py-1 rounded text-xs flex gap-1 items-center"><Share2 size={14}/> Compartir</button>
                            <button onClick={() => handlePDF(c, 'print')} disabled={generatingPdfId===c.id} className="bg-slate-800 text-white px-3 py-1 rounded text-xs flex gap-1 items-center"><Printer size={14}/> PDF</button>
                        </div>
                    </div>
                ))}
                {history.length === 0 && <p className="text-center text-slate-400">Sin historial.</p>}
            </div>
        )}

        {activeTab === 'files' && (
            <div>
                <div className="flex justify-end mb-4"><button onClick={() => setIsUploadModalOpen(true)} className="bg-white border px-4 py-2 rounded flex gap-2"><UploadCloud size={18}/> Subir</button></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {documents.map(d => (
                        <div key={d.id} className="bg-white p-2 rounded border cursor-pointer" onClick={() => d.file_type==='image' && setPreviewUrl(d.signedUrl)}>
                            {d.file_type==='image' ? <img src={d.signedUrl} className="w-full h-32 object-cover rounded"/> : <div className="h-32 bg-slate-100 flex items-center justify-center"><FileText/></div>}
                            <p className="text-xs mt-2 truncate">{d.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Modales */}
        {previewUrl && <div className="fixed inset-0 bg-black/90 z-50 flex justify-center items-center p-4" onClick={()=>setPreviewUrl(null)}><img src={previewUrl} className="max-h-full"/></div>}
        
        {isRxModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
                <div className="bg-white rounded-xl w-full max-w-lg p-6 h-[80vh] flex flex-col">
                    <h3 className="font-bold text-lg mb-4">Receta por Voz</h3>
                    <div className="flex-1 overflow-y-auto">
                        {!rxText ? (
                            <div className="text-center py-10 space-y-4">
                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isListening?'bg-red-100':'bg-slate-100'}`}><Mic size={32}/></div>
                                <p>{transcript || "Presione iniciar..."}</p>
                                <div className="flex gap-2 justify-center">
                                    <button onClick={isListening?stopListening:startListening} className="bg-slate-800 text-white px-4 py-2 rounded">{isListening?"Parar":"Iniciar"}</button>
                                    <button onClick={handleRxGenerate} disabled={!transcript} className="bg-teal-600 text-white px-4 py-2 rounded">Generar</button>
                                </div>
                            </div>
                        ) : (
                            <textarea className="w-full h-full border p-2 rounded" value={rxText} onChange={e=>setRxText(e.target.value)}/>
                        )}
                    </div>
                    {rxText && <div className="pt-4 flex justify-end gap-2"><button onClick={()=>setRxText('')} className="text-slate-500">Reintentar</button><button onClick={handleRxSave} className="bg-teal-600 text-white px-4 py-2 rounded">Guardar</button></div>}
                    <button onClick={()=>setIsRxModalOpen(false)} className="absolute top-4 right-4"><X/></button>
                </div>
            </div>
        )}

        {isUploadModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
                <div className="bg-white rounded-xl w-full max-w-sm p-6">
                    <h3 className="font-bold mb-4">Subir Archivo</h3>
                    <input className="w-full border p-2 rounded mb-4" placeholder="Nombre" value={newDocName} onChange={e=>setNewDocName(e.target.value)}/>
                    <input type="file" onChange={handleUpload} className="mb-4"/>
                    <button onClick={()=>setIsUploadModalOpen(false)} className="text-red-500">Cancelar</button>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between mb-6">
            <h2 className="text-2xl font-bold">Pacientes</h2>
            <button onClick={() => setIsModalOpen(true)} className="bg-teal-600 text-white px-4 py-2 rounded flex gap-2"><Plus/> Nuevo</button>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
            {patients.map(p => (
                <div key={p.id} onClick={() => handlePatientSelect(p)} className="p-4 border-b hover:bg-slate-50 cursor-pointer flex justify-between">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-slate-500">{p.phone}</span>
                </div>
            ))}
        </div>
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                    <h3 className="font-bold mb-4">Nuevo Paciente</h3>
                    <input className="w-full border p-2 rounded mb-2" placeholder="Nombre" value={newPatientName} onChange={e=>setNewPatientName(e.target.value)}/>
                    <input className="w-full border p-2 rounded mb-4" placeholder="Teléfono" value={newPatientPhone} onChange={e=>setNewPatientPhone(e.target.value)}/>
                    <button onClick={handleCreatePatient} className="w-full bg-teal-600 text-white py-2 rounded">Guardar</button>
                    <button onClick={()=>setIsModalOpen(false)} className="w-full mt-2 text-slate-500">Cancelar</button>
                </div>
            </div>
        )}
    </div>
  );
};

export default PatientsView;