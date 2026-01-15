import React, { useState, useEffect, useRef } from 'react';
// CORRECCIÓN DE IMPORTACIÓN: Ruta correcta './ui/DynamicIcon' si existiera, pero usamos lucide-react directo para evitar errores de ruta
import { X, Plus, Trash2, FileText, Printer, Share2, Mic, StopCircle, Loader2, Sparkles, Edit3, Eraser, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { MedicationItem, DoctorProfile } from '../types';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript?: string;
  patientName: string;
  doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ isOpen, onClose, initialTranscript = '', patientName, doctorProfile }) => {
  // Estado de medicamentos tipado correctamente
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // Este es el texto que el médico puede editar manualmente
  const [rawText, setRawText] = useState('');
  
  // Estado para el formulario manual inferior
  const [newMed, setNewMed] = useState({ drug: '', details: '', frequency: '', duration: '', notes: '' });

  // Hook de voz (Se mantiene la lógica para evitar errores de referencia, pero se oculta la UI)
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  
  // Referencia para evitar bucles de actualización
  const lastTranscriptRef = useRef('');

  // 1. SINCRONIZACIÓN EN TIEMPO REAL BLINDADA
  useEffect(() => {
    if (isListening && transcript !== lastTranscriptRef.current) {
      if (transcript.trim().length > 0) {
         setRawText(transcript);
         lastTranscriptRef.current = transcript;
      }
    }
  }, [transcript, isListening]);

  // 2. Carga inicial si viene de otra pantalla
  useEffect(() => {
    if (isOpen) {
        if (initialTranscript && !rawText) {
            setRawText(initialTranscript);
            lastTranscriptRef.current = initialTranscript;
        }
    } else {
        // Reset al cerrar
        setRawText('');
        setMedications([]);
        resetTranscript();
    }
  }, [isOpen, initialTranscript]);

  const handleExtractFromText = async () => {
    if (!rawText.trim()) {
      toast.error("El cuadro de texto está vacío. Escriba las indicaciones.");
      return;
    }
    
    setIsProcessingAI(true);
    const loadingToast = toast.loading("Analizando estructura clínica...");

    try {
      console.log("📤 Enviando texto a IA:", rawText);
      let extractedMeds: any = await GeminiMedicalService.extractMedications(rawText);
      
      console.log("📥 Respuesta cruda IA:", extractedMeds);

      // --- CAPA DE BLINDAJE DE DATOS ---
      if (typeof extractedMeds === 'string') {
          try {
              const cleaned = extractedMeds.replace(/```json/g, '').replace(/```/g, '').trim();
              extractedMeds = JSON.parse(cleaned);
          } catch (parseError) {
              toast.error("Error de formato en la respuesta de la IA.");
              setIsProcessingAI(false);
              toast.dismiss(loadingToast);
              return;
          }
      }

      if (Array.isArray(extractedMeds) && extractedMeds.length > 0) {
        const safeMeds: MedicationItem[] = extractedMeds.map((m: any) => ({
            drug: m.drug || m.name || m.medicamento || "Desconocido",
            details: m.details || m.concentration || "",
            frequency: m.frequency || m.frecuencia || "Según indicación",
            duration: m.duration || m.duracion || "",
            notes: m.notes || m.notas || "",
            action: 'NUEVO'
        } as MedicationItem));

        setMedications(prev => [...prev, ...safeMeds]);
        toast.success(`${safeMeds.length} medicamentos procesados correctamente.`);
      } else {
        toast.warning("No se detectaron medicamentos estructurados.");
      }
    } catch (error) {
      toast.error("Error de conexión con el motor de IA.");
    } finally {
      setIsProcessingAI(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleMicToggle = () => {
    // Función desactivada visualmente, pero mantenida para integridad estructural
    if (isListening) {
      stopListening();
    } else {
      setRawText('');
      resetTranscript();
      startListening();
    }
  };

  const addManualMed = () => {
    if (!newMed.drug) {
      toast.error('Nombre del medicamento es obligatorio');
      return;
    }
    
    const item: MedicationItem = {
      drug: newMed.drug,
      details: newMed.details,
      frequency: newMed.frequency,
      duration: newMed.duration,
      notes: newMed.notes,
    };

    setMedications([...medications, item]);
    setNewMed({ drug: '', details: '', frequency: '', duration: '', notes: '' });
    toast.success("Medicamento agregado");
  };

  const removeMed = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    if (medications.length === 0) return toast.error("Agrega al menos un medicamento");
    
    const loadingToast = toast.loading("Generando PDF...");
    try {
      const blob = await pdf(
        <PrescriptionPDF 
          doctorName={doctorProfile.full_name}
          specialty={doctorProfile.specialty}
          license={doctorProfile.license_number}
          phone={doctorProfile.phone || ''}
          university={doctorProfile.university || ''}
          address={doctorProfile.address || ''}
          logoUrl={doctorProfile.logo_url}
          signatureUrl={doctorProfile.signature_url}
          qrCodeUrl={(doctorProfile as any).qr_code_url} 
          patientName={patientName}
          date={new Date().toLocaleDateString()}
          prescriptions={medications}
          documentTitle="RECETA MÉDICA"
        />
      ).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
      toast.error("Error generando PDF");
    } finally {
        toast.dismiss(loadingToast);
    }
  };

  const handleWhatsApp = () => {
    if (medications.length === 0) return toast.error("La receta está vacía");
    
    const text = `*Receta Médica - Dr. ${doctorProfile.full_name}*\nPaciente: ${patientName}\n\n${medications.map((m, i) => `${i+1}. ${m.drug} ${m.details || ''}\n    Indicación: ${m.frequency} durante ${m.duration} ${m.notes ? `(${m.notes})` : ''}`).join('\n\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="bg-teal-600 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <div>
              <h3 className="font-bold text-lg leading-none">Editor de Receta</h3>
              <p className="text-teal-100 text-xs mt-1">Paciente: {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          
          {/* --- ZONA PRINCIPAL: EDICIÓN MANUAL (MICROFONO OCULTO) --- */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm mb-6 relative transition-all focus-within:border-teal-500 ring-offset-2">
              
             {/* Barra de Herramientas del Editor */}
             <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                   <Edit3 size={14} className="text-teal-600"/> 
                   {/* MODIFICACIÓN: Texto estático para ocultar estado de escucha */}
                   Texto de la Receta / Indicaciones
                </label>
                
                <div className="flex gap-2">
                   {rawText && (
                      <button onClick={() => setRawText('')} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors" title="Borrar texto">
                          <Eraser size={14}/> Borrar
                      </button>
                   )}
                </div>
             </div>

             {/* ÁREA DE TEXTO PARA EDITAR */}
             <div className="relative">
                <textarea
                   value={rawText}
                   onChange={(e) => setRawText(e.target.value)}
                   placeholder='Escriba aquí los medicamentos e indicaciones: "Paracetamol 500mg una tableta cada 8 horas por 3 días..."'
                   className="w-full bg-transparent text-lg text-slate-700 dark:text-slate-200 font-medium outline-none resize-none min-h-[120px] leading-relaxed placeholder:text-slate-300 custom-scrollbar"
                   autoFocus
                />
                
                {/* MODIFICACIÓN: El botón de micrófono ha sido ocultado para evitar fallas de dictado */}
                {/* <button 
                   onClick={handleMicToggle}
                   className={`absolute bottom-0 right-0 p-3 rounded-full shadow-lg transition-all transform hover:scale-110 z-10 ${isListening ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                >
                   {isListening ? <StopCircle size={24} /> : <Mic size={24} />}
                </button> 
                */}
             </div>

             {/* Botón de Acción Principal */}
             <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                   onClick={handleExtractFromText}
                   disabled={isProcessingAI || !rawText.trim()}
                   className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isProcessingAI ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} className="text-yellow-400"/>}
                   {isProcessingAI ? "Procesando Estructura..." : "Generar Receta Estructurada"}
                </button>
             </div>
          </div>

          {/* LISTA DE MEDICAMENTOS (RESULTADO) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3 px-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Medicamentos Listos ({medications.length})</h4>
                {medications.length > 0 && (
                    <button onClick={() => setMedications([])} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1">
                        <Trash2 size={12}/> Limpiar Lista
                    </button>
                )}
            </div>
            
            <div className="space-y-3">
                {medications.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 flex flex-col items-center gap-2">
                    <AlertTriangle size={24} className="text-slate-300"/>
                    <p className="text-slate-400 text-sm">La lista está vacía.</p>
                    <p className="text-slate-300 text-xs">Escriba arriba y presione "Generar" o agregue manualmente.</p>
                </div>
                ) : (
                medications.map((med, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start group hover:border-teal-200 transition-colors animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        {med.drug} <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border dark:border-slate-600">{med.details}</span>
                        </h4>
                        <div className="mt-2 pl-8 space-y-1">
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                <span className="text-xs text-slate-400 uppercase">Indicación:</span> {med.frequency}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                <span className="text-xs text-slate-400 uppercase">Duración:</span> {med.duration}
                            </p>
                            {med.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-yellow-50 dark:bg-yellow-900/10 p-1.5 rounded inline-block mt-1">
                                    Nota: {med.notes}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={() => removeMed(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 size={18}/></button>
                    </div>
                ))
                )}
            </div>
          </div>

          {/* FORMULARIO MANUAL */}
          <details className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <summary className="p-4 cursor-pointer font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                <span>¿Agregar manualmente?</span>
                <Plus size={16} className="text-slate-400 group-open:rotate-45 transition-transform"/>
            </summary>
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <input placeholder="Medicamento (Ej: Ibuprofeno)" value={newMed.drug} onChange={e => setNewMed({...newMed, drug: e.target.value})} className="input-std md:col-span-2 font-bold" />
              <input placeholder="Detalles (Ej: 400mg tableta)" value={newMed.details} onChange={e => setNewMed({...newMed, details: e.target.value})} className="input-std" />
              <input placeholder="Frecuencia (Ej: Cada 8 horas)" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})} className="input-std" />
              <input placeholder="Duración (Ej: 3 días)" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})} className="input-std" />
              <input placeholder="Notas (Opcional)" value={newMed.notes} onChange={e => setNewMed({...newMed, notes: e.target.value})} className="input-std" />
              <button onClick={addManualMed} className="md:col-span-2 w-full py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors shadow-sm mt-2">
                 <Plus size={16}/> Agregar a la Receta
              </button>
            </div>
          </details>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
           <button onClick={handleWhatsApp} disabled={medications.length === 0} className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg font-bold transition-colors border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed">
              <Share2 size={18} /> WhatsApp
           </button>
           <button onClick={handlePrint} disabled={medications.length === 0} className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-bold transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400">
              <Printer size={18} /> Imprimir Receta
           </button>
        </div>

        <style>{`
          .input-std {
            @apply w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400;
          }
        `}</style>
      </div>
    </div>
  );
};

export default QuickRxModal;