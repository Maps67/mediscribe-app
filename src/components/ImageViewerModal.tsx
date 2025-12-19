import React from 'react';
import { X, Download, ZoomIn } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  fileName: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl, fileName }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Botón Cerrar (Superior Derecha) */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X size={24} />
      </button>

      {/* Contenedor de la Imagen */}
      <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center">
        <img 
          src={imageUrl} 
          alt={fileName} 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
        />
        
        {/* Barra de Título y Acciones (Abajo) */}
        <div className="mt-4 flex items-center gap-4 bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
          <span className="text-white text-sm font-medium opacity-90 truncate max-w-[200px]">
            {fileName}
          </span>
          <div className="h-4 w-[1px] bg-white/20"></div>
          <a 
            href={imageUrl} 
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-brand-teal hover:text-teal-400 transition-colors uppercase tracking-wider"
          >
            <Download size={14} />
            Descargar Original
          </a>
        </div>
      </div>

      {/* Clic fuera para cerrar */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};