import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, Printer, FileText, AlertCircle } from 'lucide-react';
import { GeminiMedicalService, MedicationItem } from '../services/GeminiMedicalService';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { DoctorProfile } from '../types';

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript: string;
  patientName: string;
  doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ isOpen, onClose, initialTranscript, patientName, doctorProfile }) => {
  // Estado tipado correctamente con la interfaz importada del servicio
  const [medications, setMedications] = useState<(MedicationItem & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && initialTranscript) {
      processTranscript(initialTranscript);
    } else if (isOpen && !initialTranscript) {
        // Si abre vacío, agregamos una fila en blanco para empezar
        setMedications([{
            id: crypto.randomUUID(),
            name: '',
            details: '',
            frequency: '',
            duration: '',
            notes: ''
        }]);
    }
  }, [isOpen, initialTranscript]);

  const processTranscript = async (text: string) => {
      setLoading(true);
      try {
          // 1. Obtenemos el texto plano seguro desde el Backend
          const rawText = await GeminiMedicalService.generateQuickRxJSON(text);
          
          // 2. Parser Inteligente: Convertimos texto plano a filas
          // Asumimos que la IA separa ideas por saltos de línea
          const lines = rawText.split('\n').filter(line => line.trim().length > 0);
          
          const parsedMeds = lines.map(line => ({
              id: crypto.randomUUID(),
              name: line.replace(/^- /, '').split(',')[0] || "Revisar texto", // Intento heurístico de extraer nombre
              details: line, // Ponemos todo el texto en detalles para que el médico edite
              frequency: '', 
              duration: '',
              notes: ''
          }));

          // Si el parser no sacó nada útil, ponemos el texto crudo en una fila
          if (parsedMeds.length === 0) {
              setMedications([{
                  id: crypto.randomUUID(),
                  name: "Texto Generado",
                  details: rawText,
                  frequency: "",
                  duration: "",
                  notes: ""
              }]);
          } else {
              setMedications(parsedMeds);
          }

      } catch (error) {
          console.error("Error RX:", error);
          toast.error("No se pudo interpretar la receta. Intenta manual.");
          setMedications([{ id: crypto.randomUUID(), name: '', details: '', frequency: '', duration: '' }]);
      } finally {
          setLoading(false);
      }
  };

  const updateMed = (id: string, field: keyof MedicationItem, val: string) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
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
            date={new Date().toLocaleDateString()}
            medications={medications}
        />
      ).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
        console.error(e);
        toast.error("Error al generar PDF");
    } 
    finally { setGenerating(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-lg flex gap-2 text-slate-800 dark:text-white">
                <FileText className="text-brand-teal"/> Editor de Receta
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/50">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                    <RefreshCw className="animate-spin text-brand-teal" size={32}/> 
                    <p>Interpretando dictado médico...</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {medications.length === 0 && (
                        <div className="text-center p-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <AlertCircle className="mx-auto mb-2 opacity-50"/>
                            Agrega medicamentos para generar la receta.
                        </div>
                    )}

                    {medications.map((m, i) => (
                        <div key={m.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between mb-3 items-center">
                                <span className="font-bold text-xs uppercase text-brand-teal bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded">Medicamento #{i+1}</span>
                                <button onClick={() => setMedications(p => p.filter(x => x.id !== m.id))} className="text-slate-400 hover:text-red-500 transition-colors" title="Borrar">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-4">
                                    <input 
                                        value={m.name} 
                                        onChange={e => updateMed(m.id, 'name', e.target.value)} 
                                        placeholder="Nombre (Ej. Amoxicilina)" 
                                        className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg text-sm dark:bg-slate-900 focus:ring-2 focus:ring-brand-teal outline-none font-medium"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <input 
                                        value={m.details} 
                                        onChange={e => updateMed(m.id, 'details', e.target.value)} 
                                        placeholder="Detalles / Dosis (Ej. 500mg Capsulas)" 
                                        className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg text-sm dark:bg-slate-900 focus:ring-2 focus:ring-brand-teal outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <input 
                                        value={m.frequency} 
                                        onChange={e => updateMed(m.id, 'frequency', e.target.value)} 
                                        placeholder="Frecuencia" 
                                        className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg text-sm dark:bg-slate-900 focus:ring-2 focus:ring-brand-teal outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <input 
                                        value={m.duration} 
                                        onChange={e => updateMed(m.id, 'duration', e.target.value)} 
                                        placeholder="Duración" 
                                        className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg text-sm dark:bg-slate-900 focus:ring-2 focus:ring-brand-teal outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setMedications([...medications, {id: crypto.randomUUID(), name:'', details:'', frequency:'', duration:'', notes:''}])} 
                        className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 flex justify-center items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                    >
                        <Plus size={20}/> Agregar Medicamento Manualmente
                    </button>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
            <button onClick={onClose} className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors">
                Cancelar
            </button>
            <button 
                onClick={handlePrint} 
                disabled={generating || medications.length === 0} 
                className="px-6 py-2.5 bg-brand-teal text-white rounded-xl flex gap-2 items-center font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {generating ? <RefreshCw className="animate-spin" size={20}/> : <Printer size={20}/>} 
                {generating ? 'Generando PDF...' : 'Imprimir Receta'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default QuickRxModal;