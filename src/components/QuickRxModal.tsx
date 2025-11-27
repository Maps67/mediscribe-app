import React, { useState, useEffect } from 'react';
import { X, Plus, Printer, Trash2, FileText, Download, Share2, Pill, RefreshCw } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { MedicationItem, DoctorProfile } from '../types';
import { toast } from 'sonner';

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript: string;
  patientName: string;
  doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ 
  isOpen, onClose, initialTranscript, patientName, doctorProfile 
}) => {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState<MedicationItem>({ drug: '', details: '', frequency: '', duration: '', notes: '' });

  // Efecto de Auto-Generación al abrir
  useEffect(() => {
    if (isOpen) {
        if (initialTranscript && initialTranscript.length > 10) {
            handleAutoGenerate();
        } else {
            // Si no hay texto suficiente, iniciamos vacío para llenado manual
            setMedications([]);
        }
    }
  }, [isOpen, initialTranscript]);

  const handleAutoGenerate = async () => {
    setLoading(true);
    setMedications([]); // Limpiar lista anterior
    try {
        // Llamada blindada al servicio
        const items = await GeminiMedicalService.generateQuickRxJSON(initialTranscript, patientName);
        
        if (items && items.length > 0) {
            setMedications(items);
            toast.success("Receta interpretada correctamente");
        } else {
            toast.info("No se detectaron medicamentos claros. Puede agregarlos manualmente.");
        }
    } catch (error) {
        console.error(error);
        toast.error("Error interpretando receta. Intente manual.");
    } finally {
        setLoading(false);
    }
  };

  const addManualItem = () => {
    if (!newItem.drug) return toast.error("El nombre del medicamento es obligatorio");
    setMedications([...medications, { ...newItem, id: Date.now().toString() }]);
    setNewItem({ drug: '', details: '', frequency: '', duration: '', notes: '' });
  };

  const removeMedication = (index: number) => {
    const newMeds = [...medications];
    newMeds.splice(index, 1);
    setMedications(newMeds);
  };

  const handlePrint = async () => {
    if (medications.length === 0) return toast.error("La receta está vacía");
    
    // Convertir lista estructurada a texto para el PDF actual
    const contentText = medications.map(m => 
        `• ${m.drug} ${m.details}\n  Tomar: ${m.frequency} durante ${m.duration}.\n  Nota: ${m.notes}`
    ).join('\n\n');

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
        content={contentText} 
      />
    ).toBlob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const handleShareWhatsApp = () => {
      if (medications.length === 0) return toast.error("Receta vacía");
      const textList = medications.map(m => `💊 *${m.drug}*\nIndicación: ${m.frequency} por ${m.duration}. ${m.notes}`).join('\n\n');
      const message = `*Receta Médica - Dr. ${doctorProfile.full_name}*\nPaciente: ${patientName}\n\n${textList}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="text-brand-teal"/> Editor de Receta
              </h2>
              <p className="text-xs text-slate-500">Paciente: <span className="font-bold">{patientName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24}/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal"></div>
                    <p className="text-slate-500 animate-pulse">Interpretando audio y extrayendo medicamentos...</p>
                </div>
            ) : (
                <>
                    {/* Lista de Medicamentos */}
                    <div className="space-y-3">
                        {medications.length === 0 && (
                            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <Pill size={32} className="mx-auto mb-2 opacity-50"/>
                                <p>No hay medicamentos agregados.</p>
                                <button onClick={handleAutoGenerate} className="mt-2 text-brand-teal text-sm font-bold hover:underline flex items-center justify-center gap-1">
                                    <RefreshCw size={14}/> Reintentar extracción IA
                                </button>
                            </div>
                        )}
                        
                        {medications.map((med, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-start group">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">{med.drug} <span className="text-sm font-normal text-slate-500">{med.details}</span></h4>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                                        <p>🕒 <b>Frecuencia:</b> {med.frequency}</p>
                                        <p>📅 <b>Duración:</b> {med.duration}</p>
                                        {med.notes && <p>📝 <b>Nota:</b> {med.notes}</p>}
                                    </div>
                                </div>
                                <button onClick={() => removeMedication(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>

                    {/* Formulario Agregar Manual */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wide">Agregar Medicamento Manual</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <input className="input-modern" placeholder="Medicamento (Ej. Paracetamol)" value={newItem.drug} onChange={e => setNewItem({...newItem, drug: e.target.value})} />
                            <input className="input-modern" placeholder="Detalles (Ej. 500mg Tabs)" value={newItem.details} onChange={e => setNewItem({...newItem, details: e.target.value})} />
                            <input className="input-modern" placeholder="Frecuencia (Ej. Cada 8 horas)" value={newItem.frequency} onChange={e => setNewItem({...newItem, frequency: e.target.value})} />
                            <input className="input-modern" placeholder="Duración (Ej. 5 días)" value={newItem.duration} onChange={e => setNewItem({...newItem, duration: e.target.value})} />
                            <input className="input-modern md:col-span-2" placeholder="Notas adicionales..." value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} />
                        </div>
                        <button onClick={addManualItem} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 flex justify-center items-center gap-2">
                            <Plus size={16}/> Agregar a la lista
                        </button>
                    </div>
                </>
            )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
            <button onClick={handleShareWhatsApp} className="btn-secondary text-green-600 bg-green-50 border-green-200 hover:bg-green-100"><Share2 size={18}/> WhatsApp</button>
            <button onClick={handlePrint} className="btn-primary bg-brand-teal hover:bg-teal-600 text-white"><Printer size={18}/> Imprimir Receta</button>
        </div>

        <style>{`
            .input-modern { @apply w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal outline-none transition-all; }
            .btn-primary { @apply px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95; }
            .btn-secondary { @apply px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 border transition-colors; }
        `}</style>
      </div>
    </div>
  );
};

export default QuickRxModal;