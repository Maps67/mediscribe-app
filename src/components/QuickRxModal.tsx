import React, { useState, useEffect } from 'react';
import { X, Mic, Square, RefreshCw, Save, Printer, Share2, Download, FileText } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { DoctorProfile } from '../types'; // Importamos el tipo correcto

interface QuickRxModalProps {
  patientId: string;
  patientName: string;
  doctorProfile: DoctorProfile; // Tipado fuerte en lugar de 'any'
  onClose: () => void;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ patientId, patientName, doctorProfile, onClose }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [rxText, setRxText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'record' | 'edit'>('record');
  
  // Fecha formateada para México/Latam
  const todayStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // Limpieza al cerrar el componente (evita que el micrófono se quede abierto)
  useEffect(() => {
    return () => { stopListening(); };
  }, []);

  // --- LÓGICA DE GENERACIÓN (Paso 1 -> Paso 2) ---
  const handleGenerate = async () => {
      if (!transcript) { toast.error("No hay audio grabado"); return; }
      
      setIsProcessing(true);
      stopListening();
      
      try {
          const specialty = doctorProfile?.specialty || 'Medicina General';
          
          // Llamada al servicio "Cero Robot" que configuramos
          const formattedText = await GeminiMedicalService.generateQuickRx(transcript, specialty);
          
          setRxText(formattedText);
          setStep('edit'); // Transición a la vista de edición
      } catch (error) {
          console.error(error);
          toast.error("Error conectando con IA, usando texto crudo.");
          setRxText(transcript); // Fallback: pone el texto tal cual se escuchó
          setStep('edit');
      } finally {
          setIsProcessing(false);
      }
  };

  // --- LÓGICA DE GUARDADO EN BASE DE DATOS ---
  const handleSaveToHistory = async () => {
      if (!rxText.trim()) return;
      setIsSaving(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Sesión no válida");

          const { error } = await supabase.from('consultations').insert({
              doctor_id: user.id,
              patient_id: patientId,
              transcript: "RECETA RÁPIDA (VOZ): " + transcript, // Guardamos el original por auditoría
              summary: rxText, // Guardamos la receta final
              status: 'completed'
          });

          if (error) throw error;
          
          toast.success("Receta guardada en historial");
          // Evento personalizado para actualizar la lista de consultas sin recargar
          window.dispatchEvent(new Event('consultationSaved')); 
          onClose();
      } catch (e) {
          console.error(e);
          toast.error("Error al guardar en historial");
      } finally {
          setIsSaving(false);
      }
  };

  // --- UTILIDADES DE PDF ---
  const generatePdfBlob = async () => {
    if (!doctorProfile) return null;
    return await pdf(
      <PrescriptionPDF 
          doctorName={doctorProfile.full_name || 'Dr.'} 
          specialty={doctorProfile.specialty || ''}
          license={doctorProfile.license_number || ''} 
          phone={doctorProfile.phone || ''}
          university={doctorProfile.university || ''} 
          address={doctorProfile.address || ''}
          logoUrl={doctorProfile.logo_url} 
          signatureUrl={doctorProfile.signature_url}
          
          patientName={patientName} 
          date={todayStr}
          content={rxText || "Sin contenido"}
      />
    ).toBlob();
  };

  const handleDownloadPdf = async () => {
    const blob = await generatePdfBlob();
    if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Receta-${patientName.replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("PDF descargado");
    }
  };

  const handleShareWhatsApp = () => {
      if (!rxText.trim()) return;
      // Formato amigable para WhatsApp
      const message = `*Receta Médica para ${patientName}*\n📅 Fecha: ${todayStr}\n\n${rxText}\n\nAtte: ${doctorProfile?.full_name || 'Su Médico'}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
        
        {/* --- PASO 1: GRABADORA (Diseño Compacto) --- */}
        {step === 'record' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Mic className="text-brand-teal"/> Nueva Receta</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
                </div>
                <div className="p-8 flex flex-col items-center gap-6">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse scale-110' : 'bg-slate-100 text-slate-400'}`}>
                        <Mic size={48} />
                    </div>
                    <p className="text-center font-medium text-slate-600 dark:text-slate-300">{isListening ? "Escuchando..." : "Dicte los medicamentos e indicaciones"}</p>
                    {transcript && <div className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500 italic max-h-24 overflow-y-auto">"{transcript}"</div>}
                    
                    <div className="flex gap-3 w-full">
                        <button onClick={isListening ? stopListening : startListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${isListening ? 'bg-white border-2 border-red-100 text-red-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                            {isListening ? <><Square size={18}/> Parar</> : <><Mic size={18}/> Dictar</>}
                        </button>
                        <button onClick={handleGenerate} disabled={!transcript || isProcessing} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-teal-600 flex justify-center items-center gap-2 transition-all">
                            {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Procesar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- PASO 2: EDITOR PROFESIONAL (Diseño Amplio) --- */}
        {step === 'edit' && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                
                {/* Header Editor */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="text-brand-teal"/> Editor de Receta</h2>
                        <p className="text-sm text-slate-500">Paciente: <b>{patientName}</b></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
                </div>

                {/* Área de Texto */}
                <div className="flex-1 p-6 bg-slate-100 dark:bg-slate-950 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col min-h-[500px]">
                        <textarea 
                            className="flex-1 w-full border-none focus:ring-0 text-lg leading-relaxed resize-none bg-transparent outline-none font-mono text-slate-700 dark:text-slate-200 placeholder:text-slate-300"
                            value={rxText}
                            onChange={(e) => setRxText(e.target.value)}
                            placeholder="Aquí aparecerá la receta generada..."
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer Acciones */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-3">
                        <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl font-bold transition-colors">
                            <Share2 size={18}/> WhatsApp
                        </button>
                        <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl font-bold transition-colors">
                            <Download size={18}/> PDF
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => {setStep('record'); setRxText(''); resetTranscript();}} className="px-4 py-2 text-slate-500 hover:text-brand-teal font-bold transition-colors">Grabar de nuevo</button>
                        <button onClick={handleSaveToHistory} disabled={isSaving} className="px-6 py-2 bg-brand-teal text-white rounded-xl font-bold shadow-md hover:bg-teal-600 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default QuickRxModal;