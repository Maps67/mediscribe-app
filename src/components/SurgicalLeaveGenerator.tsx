import React, { useState } from 'react';
import { SURGICAL_CATALOG } from '../data/surgicalProcedures';
import { DynamicIcon } from './ui/DynamicIcon';

interface SurgicalLeaveGeneratorProps {
  patientName: string;
  onClose: () => void;
  onGenerate: (data: GeneratedLeaveData) => void;
}

export interface GeneratedLeaveData {
  procedureName: string;
  startDate: string;
  endDate: string;
  days: number;
  clinicalIndication: string;
  careInstructions: string;
  attachedImages: string[];
}

const SurgicalLeaveGenerator: React.FC<SurgicalLeaveGeneratorProps> = ({ 
  patientName, 
  onClose, 
  onGenerate 
}) => {
  // Estado del formulario
  const [selectedProcId, setSelectedProcId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  
  // --- Estado para las imágenes ---
  const [images, setImages] = useState<string[]>([]);

  // Calcular fecha final automáticamente
  const calculateEndDate = (start: string, duration: number): string => {
    const date = new Date(start);
    date.setDate(date.getDate() + duration);
    return date.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(startDate, days);

  // Manejar cambio de procedimiento
  const handleProcedureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const procId = e.target.value;
    setSelectedProcId(procId);

    const proc = SURGICAL_CATALOG.find(p => p.id === procId);
    if (proc) {
      setDays(proc.defaultRecoveryDays);
      setNotes(proc.description_template);
      setInstructions(proc.care_instructions);
    } else {
      setDays(0);
      setNotes('');
      setInstructions('');
    }
  };

  // --- Lógica para cargar imágenes ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!selectedProcId) return;
    
    const proc = SURGICAL_CATALOG.find(p => p.id === selectedProcId);
    
    onGenerate({
      procedureName: proc ? proc.name : 'Procedimiento Quirúrgico',
      startDate,
      endDate,
      days,
      clinicalIndication: notes,
      careInstructions: instructions,
      attachedImages: images 
    });
  };

  return (
    // OPTIMIZACIÓN MÓVIL: Estructura Flex Column con altura máxima controlada
    <div className="flex flex-col max-h-[90vh] w-full rounded-xl shadow-lg border bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 transition-colors">
      
      {/* 1. ENCABEZADO FIJO */}
      <div className="flex-none flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            Generador de Incapacidad
          </h3>
          <p className="text-sm text-gray-500">Paciente: {patientName}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors p-2" type="button">
          <DynamicIcon name="x" className="w-6 h-6" />
        </button>
      </div>

      {/* 2. CUERPO SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        
        {/* Selector de Procedimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Procedimiento Realizado</label>
          <select
            value={selectedProcId}
            onChange={handleProcedureChange}
            className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">-- Seleccionar Cirugía --</option>
            {SURGICAL_CATALOG.map((proc) => (
              <option key={proc.id} value={proc.id}>
                {proc.name} ({proc.defaultRecoveryDays} días)
              </option>
            ))}
          </select>
        </div>

        {/* Grid de Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Días Otorgados</label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Fecha Término</label>
            <div className="w-full p-2 rounded-lg border bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300">
              {endDate}
            </div>
          </div>
        </div>

        {/* Editor de Texto Médico */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Justificación Médica (Editable)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 rounded-lg border bg-white border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Seleccione un procedimiento para cargar el texto automático..."
          />
        </div>

        {/* Instrucciones de Cuidado */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Cuidados Post-Quirúrgicos</label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-3 rounded-lg border bg-gray-50 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm italic"
          />
        </div>

        {/* SECCIÓN DE EVIDENCIA FOTOGRÁFICA */}
        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
            {/* 🔥 CORRECCIÓN AQUÍ: Quitamos 'block' porque ya tiene 'flex' */}
            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
               <DynamicIcon name="camera" className="w-4 h-4" /> 
               Anexar Evidencia / Fotos
            </label>
            <div className="flex flex-wrap gap-3">
                {/* Botón de carga */}
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                    <DynamicIcon name="upload" className="w-6 h-6 text-blue-500" />
                    <span className="text-[10px] text-blue-600 font-bold mt-1">Subir</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>

                {/* Previsualización de Imágenes */}
                {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 group">
                        <img src={img} alt="Evidencia" className="w-full h-full object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm" />
                        <button 
                            type="button" // Importante para evitar submit accidental
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                        >
                            <DynamicIcon name="x" className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>

      </div>

      {/* 3. PIE DE PÁGINA FIJO */}
      <div className="flex-none flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedProcId}
          className={`px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-lg ${
            !selectedProcId 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
          }`}
        >
          <div className="flex items-center gap-2">
            <DynamicIcon name="file-text" className="w-4 h-4" />
            <span>Generar Documento</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SurgicalLeaveGenerator;