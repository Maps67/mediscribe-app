import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Pill, Clock, Calendar, FileText, Download, Share2, RefreshCw, Printer } from 'lucide-react';
import { GeminiMedicalService, MedicationItem } from '../services/GeminiMedicalService';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { DoctorProfile } from '../types'; // Asumiendo que tienes este tipo, o defínelo aquí

// Interfaz local extendida para UI
interface UIMedication extends MedicationItem {
  id: string; // ID único para React keys
}

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript: string;
  patientName: string;
  doctorProfile: DoctorProfile | null; // Necesario para el PDF
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ 
  isOpen, onClose, initialTranscript, patientName, doctorProfile 
}) => {
  const [medications, setMedications] = useState<UIMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  useEffect(() => {
    if (isOpen && initialTranscript) {
      generatePrescriptionFromAI();
    }
  }, [isOpen, initialTranscript]);

  const generatePrescriptionFromAI = async () => {
    setLoading(true);
    try {
      // Llamada al nuevo servicio JSON
      const result = await GeminiMedicalService.generateQuickRxJSON(initialTranscript);
      // Mapeamos para añadir ID
      const mapped = result.map((item) => ({ ...item, id: crypto.randomUUID() }));
      setMedications(mapped);
    } catch (error) {
      toast.error("Error al interpretar receta. Puede agregar manualmente.");
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD LOCAL ---
  const updateMedication = (id: string, field: keyof MedicationItem, value: string) => {
    setMedications(prev => prev.map(med => med.id === id ? { ...med, [field]: value } : med));
  };

  const removeMedication = (id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  };

  const addMedication = () => {
    setMedications([...medications, { 
      id: crypto.randomUUID(), 
      drug: '', details: '', frequency: '', duration: '', notes: '' 
    }]);
  };

  // --- GENERACIÓN DE PDF ---
  const handleSavePDF = async () => {
    if (!doctorProfile) {
        toast.error("Falta perfil del médico para generar PDF.");
        return;
    }
    
    setIsGeneratingPdf(true);
    try {
        // Renderizamos el componente PDF en memoria
        const blob = await pdf(
            <PrescriptionPDF 
                doctorName={doctorProfile.full_name || 'Dr. Desconocido'}
                specialty={doctorProfile.specialty || 'Medicina General'}
                license={doctorProfile.license_number || ''}
                phone={doctorProfile.phone || ''}
                university={doctorProfile.university || ''}
                address={doctorProfile.address || ''}
                logoUrl={doctorProfile.logo_url || undefined}
                signatureUrl={doctorProfile.signature_url || undefined}
                patientName={patientName}
                date={new Date().toLocaleDateString()}
                medications={medications} // Pasamos el array estructurado
            />
        ).toBlob();

        // Creamos URL y abrimos
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success("Receta generada correctamente");
    } catch (error) {
        console.error(error);
        toast.error("Error al generar el documento PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
        
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-900 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="text-brand-teal" /> Editor de Receta
            </h2>
            <p className="text-xs text-slate-500 mt-1">
                Paciente: <span className="font-bold text-slate-700 dark:text-slate-300">{patientName}</span> | 
                <span className="ml-2 text-teal-600 font-medium">IA Mode: JSON Estructurado</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-950/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <RefreshCw className="animate-spin text-brand-teal" size={40} />
              <p className="text-slate-500 font-medium animate-pulse">Analizando dictado clínico...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medications.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                      <p>No se detectaron medicamentos. Agregue uno manualmente.</p>
                  </div>
              )}

              {medications.map((med, index) => (
                <div key={med.id} className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
                  
                  {/* Fila 1: Nombre y Acciones */}
                  <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3 w-full">
                      <div className="bg-teal-100 dark:bg-teal-900/30 text-brand-teal font-bold px-2.5 py-1 rounded text-xs shrink-0">
                        #{index + 1}
                      </div>
                      <input 
                        value={med.drug}
                        onChange={(e) => updateMedication(med.id, 'drug', e.target.value)}
                        placeholder="Nombre del Medicamento"
                        className="font-bold text-lg text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-teal w-full placeholder:text-slate-300 transition-colors"
                      />
                    </div>
                    <button onClick={() => removeMedication(med.id)} className="self-end md:self-center text-slate-300 hover:text-red-500 transition-colors p-1" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Fila 2: Grid de Campos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* Concentración */}
                    <div className="relative group/input">
                      <Pill size={14} className="absolute left-3 top-3 text-slate-400 group-focus-within/input:text-teal-500" />
                      <input 
                        value={med.details}
                        onChange={(e) => updateMedication(med.id, 'details', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal outline-none transition-all"
                        placeholder="Dosis/Presentación"
                      />
                    </div>

                    {/* Frecuencia */}
                    <div className="relative group/input">
                      <Clock size={14} className="absolute left-3 top-3 text-slate-400 group-focus-within/input:text-teal-500" />
                      <input 
                        value={med.frequency}
                        onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal outline-none transition-all"
                        placeholder="Frecuencia"
                      />
                    </div>

                    {/* Duración */}
                    <div className="relative group/input">
                      <Calendar size={14} className="absolute left-3 top-3 text-slate-400 group-focus-within/input:text-teal-500" />
                      <input 
                        value={med.duration}
                        onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal outline-none transition-all"
                        placeholder="Duración"
                      />
                    </div>

                    {/* Notas */}
                    <div className="relative group/input">
                      <FileText size={14} className="absolute left-3 top-3 text-slate-400 group-focus-within/input:text-teal-500" />
                      <input 
                        value={med.notes}
                        onChange={(e) => updateMedication(med.id, 'notes', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal outline-none transition-all"
                        placeholder="Indicaciones extra"
                      />
                    </div>

                  </div>
                </div>
              ))}

              <button 
                onClick={addMedication}
                className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-brand-teal hover:border-brand-teal hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus size={20} /> Agregar otro medicamento
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
            <div className="hidden md:flex gap-2 text-xs text-slate-400">
               <span>* Verifique dosis y alergias antes de imprimir.</span>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                    onClick={onClose}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    className="flex-[2] md:flex-none px-6 py-2.5 rounded-xl bg-brand-teal text-white font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                    onClick={handleSavePDF}
                    disabled={isGeneratingPdf || medications.length === 0}
                >
                    {isGeneratingPdf ? <RefreshCw className="animate-spin" size={18}/> : <Printer size={18} />}
                    {isGeneratingPdf ? 'Generando...' : 'Imprimir Receta'}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default QuickRxModal;