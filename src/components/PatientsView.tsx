import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Calendar, User, X, Save, FileText, ChevronLeft, Clock, Trash2, Printer, Send, RefreshCw, Mic, Square, PenTool, Share2, Image as ImageIcon, UploadCloud, Eye, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';
import FormattedText from './FormattedText';
import { pdf } from '@react-pdf/renderer'; 
import PrescriptionPDF from './PrescriptionPDF';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';

// Interface local para documentos
interface PatientDocument {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  file_type: string;
  signedUrl?: string;
}

const PatientsView: React.FC = () => {
  // --- ESTADOS ---
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [doctorProfile, setDoctorProfile] = useState({ full_name: 'Doctor', specialty: 'Medicina', license_number: '', phone: '', university: '', address: '', logo_url: '', signature_url: '' });

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false); // Crear Paciente
  const [isRxModalOpen, setIsRxModalOpen] = useState(false); // Receta Voz
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // Subir Foto

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detalle Paciente
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'files'>('history');
  
  // Datos Detalle
  const [history, setHistory] = useState<Consultation[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Estado para indicar qué PDF se está generando (Loading en botón)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Lógica Voz Receta
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const [rxText, setRxText] = useState('');
  const [isProcessingRx, setIsProcessingRx] = useState(false);
  const [isSavingRx, setIsSavingRx] = useState(false);

  // Lógica Archivos
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- EFECTOS ---
  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  // --- FUNCIONES DE CARGA ---
  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile(data);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPatients(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase.from('consultations').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
      setHistory(data || []);
    } catch (error) { console.error(error); } finally { setLoadingHistory(false); }
  };

  const fetchDocuments = async (patientId: string) => {
      setLoadingDocs(true);
      try {
        const { data: docs } = await supabase.from('patient_documents').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
        if (docs) {
            // Generar URLs firmadas
            const docsUrl = await Promise.all(docs.map(async (d) => {
                let path = d.file_url;
                if(path.includes('patient-files/')) path = path.split('patient-files/')[1];
                const { data } = await supabase.storage.from('patient-files').createSignedUrl(path, 3600);
                return { ...d, signedUrl: data?.signedUrl };
            }));
            setDocuments(docsUrl as any);
        }
      } catch(e) { console.error(e); } finally { setLoadingDocs(false); }
  };

  // --- INTERACCIÓN ---
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab('history');
    fetchHistory(patient.id);
    fetchDocuments(patient.id);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setHistory([]);
    setDocuments([]);
  };

  const handleDeletePatient = async (id: string) => {
      if(!confirm("¿Eliminar paciente y todo su historial?")) return;
      try {
          await supabase.from('patients').delete().eq('id', id);
          if (selectedPatient?.id === id) handleBackToList();
          fetchPatients();
      } catch (e) { alert("Error"); }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No sesión");
      const { error } = await supabase.from('patients').insert([{ name: newPatientName, phone: newPatientPhone, doctor_id: user.id }]);
      if (error) throw error;
      setNewPatientName(''); setNewPatientPhone(''); setIsModalOpen(false); fetchPatients(); 
    } catch (error) { alert("Error"); } finally { setIsSaving(false); }
  };

  // --- LOGICA PDF (BAJO DEMANDA) ---
  const handleDownloadPDF = async (consultation: Consultation) => {
    if (!selectedPatient) return;
    setGeneratingPdfId(consultation.id); 

    try {
      const blob = await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name}
            specialty={doctorProfile.specialty}
            license={doctorProfile.license_number}
            phone={doctorProfile.phone}
            university={doctorProfile.university}
            address={doctorProfile.address}
            logoUrl={doctorProfile.logo_url}
            signatureUrl={doctorProfile.signature_url}
            patientName={selectedPatient.name}
            date={new Date(consultation.created_at).toLocaleDateString()}
            content={consultation.summary || "Sin contenido"}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receta-${selectedPatient.name}-${new Date(consultation.created_at).toLocaleDateString()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error generando PDF", error);
      alert("Error al generar el PDF.");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleSharePDF = async (consultation: Consultation) => {
    if (!selectedPatient) return;
    setGeneratingPdfId(consultation.id);
    try {
      const blob = await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name}
            specialty={doctorProfile.specialty}
            license={doctorProfile.license_number}
            phone={doctorProfile.phone}
            university={doctorProfile.university}
            address={doctorProfile.address}
            logoUrl={doctorProfile.logo_url}
            signatureUrl={doctorProfile.signature_url}
            patientName={selectedPatient.name}
            date={new Date(consultation.created_at).toLocaleDateString()}
            content={consultation.summary || "Sin contenido"}
        />
      ).toBlob();
      const file = new File([blob], `Receta-${selectedPatient.name}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Receta Médica' });
      } else { alert("Tu navegador no soporta compartir. Usa el botón de imprimir."); }
    } catch (error) { console.log("Cancelado"); } finally { setGeneratingPdfId(null); }
  };

  // --- RECETA RÁPIDA ---
  const handleGenerateRx = async () => {
      if(!transcript) return;
      setIsProcessingRx(true);
      try {
          const formattedRx = await GeminiMedicalService.generatePrescriptionOnly(transcript);
          setRxText(formattedRx);
      } catch (e) { alert("Error al generar receta"); } finally { setIsProcessingRx(false); stopListening(); }
  };

  const handleSaveRx = async () => {
      if(!rxText || !selectedPatient) return;
      setIsSavingRx(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('consultations').insert([{
            doctor_id: user.id,
            patient_id: selectedPatient.id,
            transcript: "DICTADO DE RECETA: " + transcript, 
            summary: rxText, 
            status: 'completed'
        }]);
        setIsRxModalOpen(false);
        fetchHistory(selectedPatient.id);
      } catch(e) { alert("Error guardando"); } finally { setIsSavingRx(false); }
  };

  // --- ARCHIVOS ---
  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !selectedPatient) return;
    const file = event.target.files[0];
    if(!newDocName) { alert("Escribe nombre del estudio."); return; }
    setUploadingDoc(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedPatient.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage.from('patient-files').upload(fileName, file);
        if(uploadError) throw uploadError;
        await supabase.from('patient_documents').insert([{ doctor_id: user.id, patient_id: selectedPatient.id, name: newDocName, file_url: uploadData.path, file_type: file.type.startsWith('image/') ? 'image' : 'file' }]);
        setNewDocName(''); setIsUploadModalOpen(false); fetchDocuments(selectedPatient.id);
    } catch (e) { alert("Error subiendo."); } finally { setUploadingDoc(false); }
  };

  const handleDeleteDocument = async (id: string) => {
    if(!confirm("¿Borrar?")) return;
    await supabase.from('patient_documents').delete().eq('id', id);
    if(selectedPatient) fetchDocuments(selectedPatient.id);
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // =================================================
  // VISTA 1: DETALLE DEL PACIENTE (HISTORIAL)
  // =================================================
  if (selectedPatient) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
            <button onClick={handleBackToList} className="flex items-center gap-2 text-slate-500 hover:text-brand-teal font-medium">
                <ChevronLeft size={20} /> Volver
            </button>
            <button onClick={() => {setRxText(''); setIsRxModalOpen(true);}} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-transform active:scale-95">
                <PenTool size={18} /> Nueva Receta
            </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center font-bold text-2xl border border-brand-teal/20">
                  {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                      <span className="bg-slate-50 px-2 py-1 rounded flex gap-1"><Phone size={14}/> {selectedPatient.phone || 'Sin teléfono'}</span>
                      <span className="bg-slate-50 px-2 py-1 rounded flex gap-1"><Calendar size={14}/> Reg: {new Date(selectedPatient.created_at).toLocaleDateString()}</span>
                  </div>
              </div>
           </div>
           <button onClick={() => handleDeletePatient(selectedPatient.id)} className="px-4 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm flex items-center gap-2 font-medium">
             <Trash2 size={16} /> Eliminar Paciente
           </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 mb-6">
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <FileText size={18} /> Historial Clínico
            </button>
            <button onClick={() => setActiveTab('files')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'files' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <ImageIcon size={18} /> Estudios y Archivos
            </button>
        </div>

        {/* CONTENIDO TABS */}
        {activeTab === 'history' && (
            <div className="space-y-6">
                {loadingHistory ? <div className="text-center py-10 text-slate-400"><Clock className="animate-spin mx-auto mb-2"/> Cargando...</div> : 
                 history.length === 0 ? <div className="p-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500">Sin consultas registradas.</div> : 
                 history.map((consultation) => (
                    <div key={consultation.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Calendar size={16} className="text-brand-teal" />
                                {new Date(consultation.created_at).toLocaleDateString()} 
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded">Completada</span>
                        </div>
                        <div className="p-6 bg-white"><FormattedText content={consultation.summary || "Sin notas."} /></div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-end gap-3">
                            {selectedPatient.phone && <a href={`https://wa.me/${selectedPatient.phone}?text=${encodeURIComponent(consultation.summary || '')}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-2"><Send size={16} /> WhatsApp</a>}
                            
                            <button 
                                onClick={() => handleSharePDF(consultation)} 
                                disabled={generatingPdfId === consultation.id} 
                                className="bg-brand-teal text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-teal-600 transition-colors shadow-sm"
                            >
                                {generatingPdfId === consultation.id ? <RefreshCw size={16} className="animate-spin"/> : <Share2 size={16}/>} Compartir
                            </button>

                            <button 
                                onClick={() => handleDownloadPDF(consultation)} 
                                disabled={generatingPdfId === consultation.id} 
                                className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 shadow-sm"
                            >
                                {generatingPdfId === consultation.id ? <RefreshCw size={16} className="animate-spin"/> : <Printer size={16}/>} Imprimir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'files' && (
            <div>
                <div className="flex justify-end mb-4">
                    <button onClick={() => { setNewDocName(''); setIsUploadModalOpen(true); }} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
                        <UploadCloud size={18} /> Subir Estudio
                    </button>
                </div>

                {loadingDocs ? <div className="text-center py-10 text-slate-400">Cargando archivos...</div> : 
                 documents.length === 0 ? <div className="p-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500"><ImageIcon size={48} className="mx-auto text-slate-300 mb-2"/>No hay estudios o imágenes guardadas.</div> :
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group relative hover:shadow-md transition-shadow cursor-pointer" onClick={() => doc.file_type === 'image' && setPreviewUrl(doc.signedUrl || '')}>
                            <div className="aspect-square bg-slate-100 flex items-center justify-center">
                                {doc.file_type === 'image' ? (
                                    <img src={doc.signedUrl} alt={doc.name} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = ''} />
                                ) : (
                                    <div className="text-center"><FileText size={40} className="text-slate-400 mx-auto"/><span className="text-[10px] font-bold text-slate-500 uppercase">Documento</span></div>
                                )}
                            </div>
                            <div className="p-3">
                                <p className="font-bold text-sm text-slate-700 truncate">{doc.name}</p>
                                <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50">
                                <Trash2 size={14} />
                            </button>
                            {doc.file_type !== 'image' && <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink className="text-white"/></a>}
                        </div>
                    ))}
                 </div>
                }
            </div>
        )}

        {/* MODALES */}
        {previewUrl && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
                <button className="absolute top-4 right-4 text-white p-2"><X size={32} /></button>
                <img src={previewUrl} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
        )}

        {isUploadModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Subir Estudio</h3>
                        <button onClick={() => setIsUploadModalOpen(false)}><X size={24} className="text-slate-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Estudio</label>
                            <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="Ej. Radiografía Tórax" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-teal" />
                        </div>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                            {uploadingDoc ? <RefreshCw className="animate-spin mx-auto text-brand-teal" size={32}/> : <UploadCloud className="mx-auto text-slate-400" size={32}/>}
                            <p className="text-sm text-slate-500 mt-2">{uploadingDoc ? "Subiendo..." : "Toca para seleccionar archivo o tomar foto"}</p>
                            <input type="file" accept="image/*,application/pdf" onChange={handleUploadFile} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isRxModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><PenTool className="text-brand-teal"/> Nueva Receta Rápida</h3>
                        <button onClick={() => setIsRxModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm"><X size={24} /></button>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                        {!rxText ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6 py-10">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse scale-110' : 'bg-slate-200 text-slate-400'}`}><Mic size={48} /></div>
                                <p className="text-center text-slate-600 max-w-md">{isListening ? "Escuchando dictado..." : "Presione Iniciar y dicte los medicamentos e indicaciones."}</p>
                                {transcript && <div className="w-full bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 italic">"{transcript}"</div>}
                                <div className="flex gap-4 w-full max-w-xs">
                                    <button onClick={isListening ? stopListening : startListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${isListening ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'}`}>{isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar Dictado</>}</button>
                                    <button onClick={handleGenerateRx} disabled={!transcript || isListening} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">{isProcessingRx ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Generar</button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col"><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Vista Previa de Receta</label><textarea className="flex-1 w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none resize-none font-mono text-sm leading-relaxed bg-white shadow-sm" value={rxText} onChange={(e) => setRxText(e.target.value)} /></div>
                        )}
                    </div>
                    {rxText && <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0"><button onClick={() => setRxText('')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">Reintentar</button><button onClick={handleSaveRx} disabled={isSavingRx} className="px-6 py-2 bg-brand-teal text-white rounded-lg font-bold shadow-lg hover:bg-teal-600 transition-colors flex items-center gap-2">{isSavingRx ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar y Crear PDF</button></div>}
                </div>
            </div>
        )}
    </div>
  );

  // =================================================
  // VISTA 2: LISTA DE PACIENTES (TABLA)
  // =================================================
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">Directorio de Pacientes</h2><p className="text-slate-500 text-sm">Gestione sus expedientes.</p></div>
        <button onClick={() => setIsModalOpen(true)} className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all flex items-center gap-2"><Plus size={20} /> Nuevo Paciente</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input type="text" placeholder="Buscar por nombre..." className="flex-1 outline-none text-slate-700 bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="text-center py-10 text-slate-400">Cargando...</div> : filteredPatients.length === 0 ? <div className="text-center py-10 text-slate-400">No hay pacientes.</div> : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4">Paciente</th>
                            <th className="p-4">Teléfono</th>
                            <th className="p-4 hidden md:table-cell">Fecha Registro</th>
                            <th className="p-4 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPatients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => handlePatientClick(patient)}>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">{patient.name.charAt(0).toUpperCase()}</div>
                                        <span className="font-bold text-slate-700">{patient.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-slate-500">{patient.phone || "-"}</td>
                                <td className="p-4 text-sm text-slate-500 hidden md:table-cell">{new Date(patient.created_at).toLocaleDateString()}</td>
                                <td className="p-4 text-right"><button className="text-brand-teal hover:bg-teal-50 p-2 rounded-full transition-colors"><ChevronRight size={20} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-lg text-slate-800">Registrar Paciente</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button></div>
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label><input type="text" required className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label><input type="tel" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" value={newPatientPhone} onChange={e => setNewPatientPhone(e.target.value)} /></div>
              <button type="submit" disabled={isSaving} className="w-full bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600">{isSaving ? 'Guardando...' : 'Guardar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsView;