import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Printer, Share2, Mic, StopCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { MedicationItem, DoctorProfile } from '../types';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { GeminiMedicalService } from '../services/GeminiMedicalService';

// Importamos el hook de reconocimiento de voz (Asegúrate de que este hook exista en tu proyecto)
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript?: string; // Puede venir vacío si empezamos de cero
  patientName: string;
  doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ isOpen, onClose, initialTranscript = '', patientName, doctorProfile }) => {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // Estado para el formulario manual
  const [newMed, setNewMed] = useState({ name: '', details: '', frequency: '', duration: '', notes: '' });

  // Hook de voz para dictado en vivo
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Efecto: Si abrimos el modal con un texto previo (ej. desde consulta), intentamos extraer
  useEffect(() => {
    if (isOpen && initialTranscript && medications.length === 0) {
      handleExtractFromText(initialTranscript);
    }
  }, [isOpen, initialTranscript]);

  // Función: Extraer medicamentos usando IA (Gemini)
  const handleExtractFromText = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    
    setIsProcessingAI(true);
    try {
      const extractedMeds = await GeminiMedicalService.extractMedications(textToProcess);
      if (extractedMeds && extractedMeds.length > 0) {
        setMedications(prev => [...prev, ...extractedMeds]);
        toast.success(`${extractedMeds.length} medicamentos detectados`);
      } else {
        toast.info("No se detectaron medicamentos claros en el dictado.");
      }
    } catch (error) {
      console.error("Error extracting meds:", error);
      toast.error("Error al procesar con IA");
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Función: Manejar el botón de micrófono
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      // Al detener, enviamos lo que se escuchó a la IA
      if (transcript) {
        handleExtractFromText(transcript);
      }
    } else {
      resetTranscript(); // Limpiamos lo anterior
      startListening();
    }
  };

  const addManualMed = () => {
    if (!newMed.name || !newMed.frequency) {
      toast.error('Nombre y frecuencia son obligatorios');
      return;
    }
    const item: MedicationItem = {
      drug: newMed.name,
      ...newMed
    };
    setMedications([...medications, item]);
    setNewMed({ name: '', details: '', frequency: '', duration: '', notes: '' });
  };

  const removeMed = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    if (medications.length === 0) return toast.error("Agrega al menos un medicamento");
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
          patientName={patientName}
          date={new Date().toLocaleDateString()}
          medications={medications}
          documentTitle="RECETA MÉDICA" // Título correcto
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      toast.error("Error generando PDF");
    }
  };

  const handleWhatsApp = () => {
    if (medications.length === 0) return;
    const text = `*Receta Médica - Dr. ${doctorProfile.full_name}*\nPaciente: ${patientName}\n\n${medications.map((m, i) => `${i+1}. ${m.drug} ${m.details || ''}\n   Indicación: ${m.frequency} durante ${m.duration} ${m.notes ? `(${m.notes})` : ''}`).join('\n\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-teal-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <div>
              <h3 className="font-bold text-lg leading-none">Editor de Receta</h3>
              <p className="text-teal-100 text-xs mt-1">Paciente: {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          
          {/* ZONA DE DICTADO IA */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 text-center">
             
             {isProcessingAI ? (
                <div className="flex flex-col items-center justify-center py-4 text-teal-600 animate-pulse">
                   <Loader2 size={32} className="animate-spin mb-2" />
                   <span className="text-sm font-bold">Procesando dictado con IA...</span>
                </div>
             ) : (
                <>
                   {/* Botón de Micrófono Principal */}
                   <button 
                      onClick={handleMicToggle}
                      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all transform shadow-lg ${isListening ? 'bg-red-500 hover:bg-red-600 scale-110 ring-4 ring-red-200' : 'bg-teal-600 hover:bg-teal-700 hover:scale-105'}`}
                   >
                      {isListening ? <StopCircle size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                   </button>
                   
                   <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {isListening ? 'Escuchando... (Dicte los medicamentos)' : 'Toque para dictar la receta'}
                   </p>
                   
                   {transcript && (
                      <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-500 italic">
                         "{transcript}"
                      </div>
                   )}

                   {/* Botón Reintentar (Texto) si falló o si quieren agregar más */}
                   <button 
                      onClick={() => handleExtractFromText(transcript || initialTranscript)} 
                      className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center justify-center gap-1 mx-auto"
                   >
                      <Sparkles size={12} /> Reintentar extracción IA
                   </button>
                </>
             )}
          </div>

          {/* LISTA DE MEDICAMENTOS */}
          <div className="mb-6 space-y-3">
            {medications.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <p className="text-slate-400">No hay medicamentos agregados.</p>
              </div>
            ) : (
              medications.map((med, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start group">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">{idx + 1}</span>
                       {med.drug || med.name} <span className="text-xs font-normal text-slate-500">{med.details}</span>
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 pl-8">
                       {med.frequency} • {med.duration}
                    </p>
                    {med.notes && <p className="text-xs text-slate-400 mt-1 pl-8 italic">{med.notes}</p>}
                  </div>
                  <button onClick={() => removeMed(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                </div>
              ))
            )}
          </div>

          {/* FORMULARIO MANUAL */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Agregar Manualmente</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input placeholder="Medicamento (Ej. Paracetamol)" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} className="input-std col-span-2" />
              <input placeholder="Detalles (500mg)" value={newMed.details} onChange={e => setNewMed({...newMed, details: e.target.value})} className="input-std" />
              <input placeholder="Frecuencia (Cada 8h)" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})} className="input-std" />
              <input placeholder="Duración (3 días)" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})} className="input-std" />
              <input placeholder="Notas adicionales..." value={newMed.notes} onChange={e => setNewMed({...newMed, notes: e.target.value})} className="input-std col-span-2" />
            </div>
            <button onClick={addManualMed} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 flex items-center justify-center gap-2"><Plus size={16}/> Agregar a la lista</button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
           <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg font-bold transition-colors">
              <Share2 size={18} /> WhatsApp
           </button>
           <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-bold transition-colors shadow-lg shadow-teal-500/20">
              <Printer size={18} /> Imprimir Receta
           </button>
        </div>

        <style>{`
          .input-std {
            @apply w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all;
          }
        `}</style>
      </div>
    </div>
  );
};

export default QuickRxModal;