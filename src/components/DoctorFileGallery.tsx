import React, { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, RefreshCw, Eye, FolderOpen } from 'lucide-react';
// 🛡️ CORRECCIÓN 1: Importamos la instancia ÚNICA, no creamos una nueva.
import { supabase } from '../lib/supabase';
import { ImageViewerModal } from './ImageViewerModal';

// Nota: Ya no necesitamos declarar supabaseUrl ni supabaseKey aquí porque usamos la instancia central.
const BUCKET_NAME = 'pacientes';

interface FileObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    mimetype?: string;
    size?: number;
    [key: string]: any;
  };
}

interface DoctorFileGalleryProps {
  patientId?: string; 
}

export const DoctorFileGallery: React.FC<DoctorFileGalleryProps> = ({ patientId }) => {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ESTADOS DEL VISOR
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const fetchFiles = async () => {
    if (!patientId) {
        setFiles([]);
        return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(patientId, {
          limit: 50,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error cargando archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [patientId]);

  // --- LÓGICA DE DETECCIÓN DE IMAGEN BLINDADA ---
  const isImageFile = (file: FileObject) => {
    // 1. Chequeo por extensión (Lo más fiable visualmente)
    const extension = file.name.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'];
    if (extension && imageExtensions.includes(extension)) return true;

    // 2. Chequeo por metadatos (Respaldo técnico)
    if (file.metadata?.mimetype?.startsWith('image/')) return true;

    return false;
  };

  const handleViewFile = async (file: FileObject) => {
    if (!patientId) return;
    
    // Generamos la URL temporal
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(`${patientId}/${file.name}`, 3600);
    
    if (data?.signedUrl) {
      if (isImageFile(file)) {
        // ES IMAGEN -> Abrimos Modal
        setSelectedImage(data.signedUrl);
        setSelectedFileName(file.name);
      } else {
        // NO ES IMAGEN -> Descarga / Nueva Pestaña
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  // 🛡️ CORRECCIÓN 2: Lógica segura para mostrar nombres
  const getDisplayName = (fileName: string) => {
    // Si el archivo tiene un prefijo de timestamp (ej: 171500_foto.png), lo limpiamos.
    // Si no tiene guion bajo, mostramos el nombre original para evitar vacíos.
    const parts = fileName.split('_');
    if (parts.length > 1) {
        return parts.slice(1).join('_');
    }
    return fileName;
  };

  if (!patientId) {
      return (
          <div className="p-8 text-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 h-full flex flex-col items-center justify-center">
              <FolderOpen className="mb-2 opacity-50" size={32}/>
              <p className="text-xs font-medium">Seleccione un paciente<br/>para ver su expediente.</p>
          </div>
      )
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider">
              Expediente Digital
          </h3>
          <button onClick={fetchFiles} className="text-gray-400 hover:text-brand-teal transition-colors" title="Actualizar lista">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">Cargando...</div>
          ) : files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2 py-8">
              <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full"><FileText size={20}/></div>
              Carpeta vacía
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((file) => {
                const isImg = isImageFile(file);
                
                return (
                  <li 
                    key={file.id} 
                    className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md group transition-colors cursor-pointer"
                    onClick={() => handleViewFile(file)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${isImg ? 'bg-purple-50 text-purple-500 dark:bg-purple-900/20' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20'}`}>
                        {isImg ? <ImageIcon size={14} /> : <FileText size={14} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate block max-w-[140px]">
                          {/* Usamos la nueva función segura */}
                          {getDisplayName(file.name)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {file.metadata?.size ? (file.metadata.size / 1024).toFixed(0) : '0'} KB • {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-300 hover:text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity" title={isImg ? "Ver imagen" : "Abrir documento"}>
                      <Eye size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ImageViewerModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage}
        fileName={selectedFileName}
      />
    </>
  );
};