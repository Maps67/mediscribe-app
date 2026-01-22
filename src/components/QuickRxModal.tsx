import React, { useState } from 'react';
import { 
  X, Plus, Trash2, FileText, Printer, Share2, Pill, 
  FileSignature, Loader2, Lock, Paperclip, UploadCloud, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { MedicationItem, DoctorProfile } from '../types';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
// ✅ IMPORTACIÓN DEL GESTOR DE ARCHIVOS
import { UploadMedico } from './UploadMedico';

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript?: string; 
  patientName: string;
  // ✅ ID CRÍTICO para vinculación de archivos
  patientId?: string; 
  doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ isOpen, onClose, patientName, patientId, doctorProfile }) => {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false); 
  
  // ✅ ESTADO: Comentarios Internos (Expediente)
  const [internalNote, setInternalNote] = useState('');

  // Estado para el formulario manual
  const [newMed, setNewMed] = useState({ drug: '', details: '', frequency: '', duration: '', notes: '' });

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const addManualMed = () => {
    if (!newMed.drug.trim()) {
      toast.error('El nombre del medicamento es obligatorio');
      return;
    }
    
    const item: MedicationItem = {
      drug: capitalize(newMed.drug),
      details: newMed.details, 
      frequency: capitalize(newMed.frequency), 
      duration: newMed.duration,
      notes: newMed.notes ? capitalize(newMed.notes) : '',
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
      console.error(e);
      toast.error("Error generando PDF");
    } finally {
        toast.dismiss(loadingToast);
    }
  };

  const handleWhatsApp = async () => {
    if (medications.length === 0) return toast.error("La receta está vacía");
    
    setIsGeneratingShare(true);
    const loadingToast = toast.loading("Preparando PDF para compartir...");

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

      const fileName = `Receta_${patientName.replace(/\s+/g, '_')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Receta Médica',
          text: `Hola, adjunto la receta médica para ${patientName}.`,
        });
        toast.success("Menú de compartir abierto");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.info("PDF Descargado. Por favor adjúntelo en WhatsApp Web.");
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(`Hola, adjunto la receta médica para ${patientName}.`)}`, '_blank');
      }

    } catch (e: any) {
      console.error("Error al compartir:", e);
      if (e.name !== 'AbortError') { 
         toast.error("No se pudo compartir el archivo directamente.");
      }
    } finally {
      setIsGeneratingShare(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleUploadComplete = () => {
      toast.success("Archivo adjuntado al expediente correctamente.");
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
              <h3 className="font-bold text-lg leading-none">Nueva Receta</h3>
              <p className="text-teal-100 text-xs mt-1 font-mono tracking-wide flex items-center gap-1">
                <span className="opacity-70">PACIENTE:</span> {patientName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 space-y-6">
          
          {/* 1. FORMULARIO DE AGREGADO */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm transition-all focus-within:border-teal-500 ring-offset-2">
             <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FileSignature size={18} className="text-teal-600" />
                <h4 className="font-bold text-slate-700 dark:text-white text-sm uppercase tracking-wide">Redacción de Medicamento</h4>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Nombre Genérico / Comercial</label>
                    <input 
                        placeholder="Ej: Paracetamol (Tempra)" 
                        value={newMed.drug} 
                        onChange={e => setNewMed({...newMed, drug: e.target.value})} 
                        className="input-std font-bold text-lg" 
                        autoFocus
                    />
                </div>
                
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Presentación / Dosis</label>
                    <input 
                        placeholder="Ej: Tableta de 500mg" 
                        value={newMed.details} 
                        onChange={e => setNewMed({...newMed, details: e.target.value})} 
                        className="input-std" 
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Tiempo de Tratamiento</label>
                    <input 
                        placeholder="Ej: 3 días / 1 semana" 
                        value={newMed.duration} 
                        onChange={e => setNewMed({...newMed, duration: e.target.value})} 
                        className="input-std" 
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-teal-600 uppercase ml-1 mb-1 flex items-center gap-1">
                        Indicación Completa (Posología) <span className="text-red-400">*</span>
                    </label>
                    <input 
                        placeholder="Ej: Tomar 1 tableta vía oral cada 8 horas (Sea descriptivo)" 
                        value={newMed.frequency} 
                        onChange={e => setNewMed({...newMed, frequency: e.target.value})} 
                        className="input-std border-teal-100 bg-teal-50/30 focus:bg-white" 
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Observaciones (Para el paciente)</label>
                    <input 
                        placeholder="Ej: Suspender en caso de alergia, tomar con alimentos..." 
                        value={newMed.notes} 
                        onChange={e => setNewMed({...newMed, notes: e.target.value})} 
                        className="input-std" 
                    />
                </div>

                <button 
                    onClick={addManualMed} 
                    className="md:col-span-2 w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-slate-900 flex items-center justify-center gap-2 transition-colors shadow-md mt-2 active:scale-[0.98]"
                >
                   <Plus size={18}/> Agregar a la Receta
                </button>
             </div>
          </div>

          {/* 2. LISTA DE MEDICAMENTOS (PREVIEW) */}
          {medications.length > 0 && (
            <div className="mb-2">
                <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase">Vista Previa ({medications.length})</h4>
                    <button onClick={() => setMedications([])} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1">
                        <Trash2 size={12}/> Borrar Todo
                    </button>
                </div>
                
                <div className="space-y-3">
                    {medications.map((med, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start group hover:border-teal-200 transition-colors animate-in fade-in slide-in-from-bottom-2">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                                {med.drug} 
                                {med.details && <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border dark:border-slate-600 align-middle ml-2">{med.details}</span>}
                            </h4>
                            <div className="mt-2 pl-8 space-y-1">
                                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                    <span className="font-bold text-teal-700">Ind:</span> {med.frequency}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <span className="text-xs uppercase text-slate-400 font-bold">Tiempo:</span> {med.duration}
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
                    ))}
                </div>
            </div>
          )}

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* 3. ✅ ZONA DE GESTIÓN DE ARCHIVOS (UNIVERSAL) */}
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
              <div className="flex items-center gap-2 mb-3">
                  <Paperclip size={18} className="text-indigo-600 dark:text-indigo-400"/>
                  <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">Adjuntos Universales (Expediente)</h4>
              </div>
              
              {patientId ? (
                  <>
                    <UploadMedico 
                        // Creamos un objeto paciente mínimo compatible con el componente UploadMedico
                        preSelectedPatient={{ 
                          id: patientId, 
                          name: patientName,
                          doctor_id: doctorProfile.id 
                      } as any}
                      onUploadComplete={handleUploadComplete}
                    />
                    <p className="text-[10px] text-indigo-400 mt-2 text-center">
                        Soporta Imágenes, PDF y DICOM. Se guardarán automáticamente en el historial.
                    </p>
                  </>
              ) : (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs">
                      <AlertCircle size={16}/>
                      <span>Error de Vinculación: No se detecta ID del paciente. Actualice el listado.</span>
                  </div>
              )}
          </div>

          {/* 4. ✅ COMENTARIOS TÉCNICOS INTERNOS */}
          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
              <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                      <Lock size={14}/> Comentarios Privados (Uso Interno)
                  </h4>
                  <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      No visible en receta
                  </span>
              </div>
              <textarea 
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Escriba aquí notas técnicas, justificación clínica o recordatorios personales sobre esta prescripción..."
                  className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-400 min-h-[80px]"
              />
          </div>

        </div>

        {/* FOOTER DE ACCIONES */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 z-10">
           <button 
                onClick={handleWhatsApp} 
                disabled={medications.length === 0 || isGeneratingShare} 
                className="flex items-center gap-2 px-4 py-3 text-green-600 bg-green-50 hover:bg-green-100 rounded-xl font-bold transition-colors border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingShare ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18} />} 
              {isGeneratingShare ? 'Creando PDF...' : 'WhatsApp (PDF)'}
           </button>
           
           <button onClick={handlePrint} disabled={medications.length === 0} className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white hover:bg-teal-700 rounded-xl font-bold transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400">
              <Printer size={18} /> Imprimir Receta
           </button>
        </div>

        <style>{`
          .input-std {
            @apply w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-teal-500;
          }
        `}</style>
      </div>
    </div>
  );
};

export default QuickRxModal;