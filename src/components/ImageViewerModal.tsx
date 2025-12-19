import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  fileName: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl, fileName }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Botón Cerrar (Esquina Superior Derecha - Grande para fácil acceso) */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 shadow-lg"
      >
        <X size={28} />
      </button>

      {/* Contenedor de la Imagen */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt={fileName} 
          className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
          onClick={(e) => e.stopPropagation()} 
        />
        
        {/* Barra Inferior con Nombre y Descarga opcional */}
        <div className="mt-4 flex items-center gap-6 bg-gray-900/80 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md text-white">
          <span className="text-sm font-medium opacity-90 truncate max-w-[200px] md:max-w-md">
            {fileName}
          </span>
          <div className="h-5 w-[1px] bg-white/30"></div>
          <a 
            href={imageUrl} 
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-brand-teal hover:text-teal-400 transition-colors uppercase tracking-wider"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={16} />
            Descargar
          </a>
        </div>
      </div>

      {/* Clic en el fondo para cerrar */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};