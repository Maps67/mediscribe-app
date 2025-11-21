import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Calendar, User, X, Save, FileText, ChevronLeft, Clock, Trash2, Printer, Send, RefreshCw, Mic, Square, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';
import FormattedText from './FormattedText';
import { pdf } from '@react-pdf/renderer'; // Usamos pdf() imperativo, NO el componente DownloadLink
import PrescriptionPDF from './PrescriptionPDF';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [doctorProfile, setDoctorProfile] = useState({ full_name: 'Doctor', specialty: 'Medicina', license_number: '', phone: '', university: '', address: '', logo_url: '', signature_url: '' });

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Consultation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Estado para indicar qué PDF se está generando
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const [rxText, setRxText] = useState('');
  const [isProcessingRx, setIsProcessingRx] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

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
      const { data, error } = await supabase.from('consultations').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (error) { console.error(error); } finally { setLoadingHistory(false); }
  };

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchHistory(patient.id);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setHistory([]);
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

  const handleOpenRxModal = () => {
      setRxText('');
      setIsRxModalOpen(true);
  };

  const handleGenerateRx = async () => {
      if(!transcript) return;
      setIsProcessingRx(true);
      try {
          const formattedRx = await GeminiMedicalService.generatePrescriptionOnly(transcript);
          setRxText(formattedRx);
      } catch (e) {
          alert("Error al generar receta");
      } finally {
          setIsProcessingRx(false);
          stopListening();
      }
  };

  const handleSaveRx = async () => {
      if(!rxText || !selectedPatient) return;
      setIsSaving(true);
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
      } catch(e) { alert("Error guardando"); } finally { setIsSaving(false); }
  };

  // --- GENERACIÓN DE PDF BAJO DEMANDA ---
  const handleDownloadPDF = async (consultation: Consultation) => {
    if (!selectedPatient) return;
    setGeneratingPdfId(consultation.id); // Activar loading en ese botón específico

    try {
      // Generamos el Blob
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

      // Creamos un link invisible y le damos click para descargar
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
      alert("Error al generar el PDF. Intente de nuevo.");
    } finally {
      setGeneratingPdfId(null); // Apagar loading
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

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (selectedPatient) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
            <button onClick={handleBackToList} className="flex items-center gap-2 text-slate-500 hover:text-brand-teal font-medium">
                <ChevronLeft size={20} /> Volver
            </button>
            <button onClick={handleOpenRxModal} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-transform active:scale-95">
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

        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-brand-teal" size={20} /> Historial ({history.length})</h3>

        <div className="space-y-6">
            {history.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                            <Calendar size={16} className="text-brand-teal" />
                            {new Date(consultation.created_at).toLocaleDateString()} 
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded">Completada</span>
                    </div>
                    <div className="p-6 bg-white">
                        <FormattedText content={consultation.summary || "Sin notas."} />
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-end gap-3">
                        {selectedPatient.phone && (
                            <a href={`https://wa.me/${selectedPatient.phone}?text=${encodeURIComponent(consultation.summary || '')}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-2"><Send size={16} /> WhatsApp</a>
                        )}
                        
                        {/* BOTÓN COMPARTIR */}
                        <button onClick={() => handleSharePDF(consultation)} disabled={generatingPdfId === consultation.id} className="bg-brand-teal text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-teal-600 transition-colors shadow-sm">
                            {generatingPdfId === consultation.id ? <RefreshCw size={16} className="animate-spin"/> : <Share2 size={16}/>} Compartir
                        </button>

                        {/* BOTÓN IMPRIMIR (SOLUCIÓN CRASH) */}
                        <button 
                            onClick={() => handleDownloadPDF(consultation)} 
                            disabled={generatingPdfId === consultation.id}
                            className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 shadow-sm"
                        >
                            {generatingPdfId === consultation.id ? <RefreshCw size={16} className="animate-spin"/> : <Printer size={16}/>} 
                            Imprimir
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {/* MODAL RECETA (Sin cambios) */}
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
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse scale-110' : 'bg-slate-200 text-slate-400'}`}>
                                    <Mic size={48} />
                                </div>
                                <p className="text-center text-slate-600 max-w-md">
                                    {isListening ? "Escuchando dictado..." : "Presione Iniciar y dicte los medicamentos e indicaciones."}
                                </p>
                                {transcript && (
                                    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 italic">"{transcript}"</div>
                                )}
                                <div className="flex gap-4 w-full max-w-xs">
                                    <button onClick={isListening ? stopListening : startListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${isListening ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'}`}>
                                        {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar Dictado</>}
                                    </button>
                                    <button onClick={handleGenerateRx} disabled={!transcript || isListening} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                        {isProcessingRx ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Generar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Vista Previa de Receta</label>
                                <textarea 
                                    className="flex-1 w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none resize-none font-mono text-sm leading-relaxed bg-white shadow-sm"
                                    value={rxText}
                                    onChange={(e) => setRxText(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {rxText && (
                        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setRxText('')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">Reintentar</button>
                            <button onClick={handleSaveRx} disabled={isSaving} className="px-6 py-2 bg-brand-teal text-white rounded-lg font-bold shadow-lg hover:bg-teal-600 transition-colors flex items-center gap-2">
                                {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar y Crear PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default PatientsView;