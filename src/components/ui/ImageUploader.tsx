import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader, CheckCircle } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  imageSrc?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void; // Opcional, por si en el futuro queremos borrar
  helperText?: string;
  aspectRatio?: 'square' | 'wide';
  icon?: React.ReactNode;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  imageSrc, 
  onUpload, 
  onRemove,
  helperText = "PNG, JPG o JPEG (Max 2MB)",
  aspectRatio = 'square',
  icon
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación básica de tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor sube un archivo de imagen válido.');
      return;
    }

    try {
      setIsUploading(true);
      await onUpload(file);
    } catch (error) {
      console.error("Error interno en ImageUploader:", error);
    } finally {
      setIsUploading(false);
      // Limpiamos el input para permitir subir el mismo archivo si el usuario quiere reintentar
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // Clases dinámicas según el aspecto (cuadrado para QR/Logo, ancho para Firma)
  const containerHeightClass = aspectRatio === 'wide' ? 'h-32' : 'aspect-square h-48';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
      {/* Encabezado del Componente */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon || <ImageIcon size={18} className="text-brand-teal"/>} 
          {label}
        </div>
        {imageSrc && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle size={10} /> Cargado
          </span>
        )}
      </div>

      {/* Área de Carga / Previsualización */}
      <div className="p-6 flex flex-col items-center justify-center flex-1">
        <div 
          className={`
            relative w-full ${containerHeightClass} 
            border-2 border-dashed rounded-lg flex items-center justify-center 
            overflow-hidden transition-all duration-200 cursor-pointer group
            ${imageSrc 
              ? 'border-brand-teal bg-teal-50/10 dark:bg-teal-900/10' 
              : 'border-slate-300 dark:border-slate-600 hover:border-brand-teal hover:bg-slate-50 dark:hover:bg-slate-700'
            }
          `}
          onClick={triggerUpload}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-brand-teal animate-pulse">
              <Loader size={28} className="animate-spin mb-2" />
              <span className="text-xs font-bold">Subiendo...</span>
            </div>
          ) : imageSrc ? (
            <>
              <img 
                src={imageSrc} 
                alt={label} 
                className="w-full h-full object-contain p-2" 
              />
              {/* Overlay al pasar el mouse */}
              <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <Upload className="text-white mb-1" size={24} />
                <span className="text-white text-xs font-bold uppercase tracking-wider">Cambiar Imagen</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 p-4 text-center">
              <Upload size={32} className="mb-2 opacity-50 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Click para subir</span>
              {aspectRatio === 'wide' && <span className="text-[10px] mt-1 text-slate-400">(Formato Horizontal)</span>}
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
          />
        </div>
        
        <p className="text-[10px] text-slate-400 mt-3 text-center px-4">
          {helperText}
        </p>
      </div>
    </div>
  );
};