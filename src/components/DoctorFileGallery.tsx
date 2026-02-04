import React, { useEffect, useState } from 'react';
import { 
  FileText, Image as ImageIcon, RefreshCw, Eye, FolderOpen, Loader2, Download,
  Pencil, Trash2, Check, X, MoreVertical 
} from 'lucide-react';
// 🛡️ CONEXIÓN SINGLETON
import { supabase } from '../lib/supabase';
import { ImageViewerModal } from './ImageViewerModal';
import { toast } from 'sonner';

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

  // ESTADOS DE EDICIÓN
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

      // 🛡️ SANITIZACIÓN DE DATOS
      const cleanFiles = (data || []).filter(f => 
        f.name !== '.emptyFolderPlaceholder' && 
        !f.name.endsWith('_progress') && 
        f.metadata 
      );

      setFiles(cleanFiles);
    } catch (error) {
      console.error('Error cargando archivos:', error);
      toast.error("Error al cargar la galería.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [patientId]);

  const isImageFile = (file: FileObject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'];
    if (extension && imageExtensions.includes(extension)) return true;
    if (file.metadata?.mimetype?.startsWith('image/')) return true;
    return false;
  };

  const handleViewFile = async (file: FileObject) => {
    if (!patientId || editingFileId) return; // No abrir si se está editando
    
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(`${patientId}/${file.name}`, 3600);
    
    if (data?.signedUrl) {
      if (isImageFile(file)) {
        setSelectedImage(data.signedUrl);
        setSelectedFileName(file.name);
      } else {
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  // 🧹 LIMPIADOR DE NOMBRE VISUAL
  // Convierte "1709823_radiografia.jpg" -> "radiografia.jpg"
  const getDisplayName = (fileName: string) => {
    const parts = fileName.split('_');
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
        return parts.slice(1).join('_');
    }
    return fileName;
  };

  // ✏️ INICIAR EDICIÓN
  const startEditing = (e: React.MouseEvent, file: FileObject) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    // Quitamos la extensión para que el médico solo edite el nombre
    const displayName = getDisplayName(file.name);
    const nameWithoutExt = displayName.substring(0, displayName.lastIndexOf('.')) || displayName;
    setNewFileName(nameWithoutExt);
  };

  // 💾 GUARDAR NUEVO NOMBRE
  const saveRename = async (e: React.MouseEvent, file: FileObject) => {
    e.stopPropagation();
    if (!patientId || !newFileName.trim()) return;

    setIsProcessing(true);
    try {
        const fileExt = file.name.split('.').pop();
        // Mantenemos el timestamp original si existe, o generamos uno nuevo para evitar colisiones
        const timestamp = Date.now(); 
        const finalName = `${timestamp}_${newFileName.trim()}.${fileExt}`;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .move(`${patientId}/${file.name}`, `${patientId}/${finalName}`);

        if (error) throw error;

        toast.success("Archivo renombrado correctamente");
        setEditingFileId(null);
        fetchFiles(); // Recargar lista
    } catch (error) {
        console.error("Error renaming:", error);
        toast.error("No se pudo renombrar el archivo.");
    } finally {
        setIsProcessing(false);
    }
  };

  // ❌ CANCELAR EDICIÓN
  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(null);
    setNewFileName('');
  };

  // 🗑️ ELIMINAR ARCHIVO
  const handleDelete = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    if (!patientId) return;
    
    if (!window.confirm("¿Estás seguro de eliminar este archivo permanentemente?")) return;

    setIsProcessing(true);
    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([`${patientId}/${fileName}`]);

        if (error) throw error;

        toast.success("Archivo eliminado.");
        fetchFiles();
    } catch (error) {
        console.error("Error deleting:", error);
        toast.error("Error al eliminar archivo.");
    } finally {
        setIsProcessing(false);
    }
  };


  if (!patientId) {
      return (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl bg-slate-50 h-full flex flex-col items-center justify-center">
              <FolderOpen className="mb-2 text-slate-300" size={32}/>
              <p className="text-xs font-medium">Seleccione un paciente<br/>para ver su expediente.</p>
          </div>
      )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
        {/* Header "Clinical Clean" */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                <FolderOpen size={16}/>
              </div>
              Expediente Digital
          </h3>
          <button 
            onClick={fetchFiles} 
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
            title="Actualizar lista"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto min-h-[200px] custom-scrollbar">
          {loading && files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
               <Loader2 className="animate-spin text-blue-500" size={24}/>
               <span className="text-xs">Cargando documentos...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-3 py-8 opacity-60">
              <FileText size={32} strokeWidth={1.5}/>
              <p>Carpeta vacía</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => {
                const isImg = isImageFile(file);
                const isEditing = editingFileId === file.id;
                
                return (
                  <li 
                    key={file.id} 
                    className={`flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group transition-all ${!isEditing ? 'hover:border-blue-200 hover:shadow-sm cursor-pointer' : ''}`}
                    onClick={() => !isEditing && handleViewFile(file)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isImg ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                      </div>
                      
                      <div className="flex flex-col min-w-0 flex-1 mr-2">
                        {isEditing ? (
                            // MODO EDICIÓN
                            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <input 
                                    type="text" 
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveRename(e as any, file);
                                        if (e.key === 'Escape') cancelEditing(e as any);
                                    }}
                                />
                                <button onClick={(e) => saveRename(e, file)} disabled={isProcessing} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16}/></button>
                                <button onClick={cancelEditing} disabled={isProcessing} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16}/></button>
                            </div>
                        ) : (
                            // MODO VISUALIZACIÓN
                            <>
                                <span className="text-sm font-bold text-slate-700 truncate block group-hover:text-blue-700 transition-colors">
                                  {getDisplayName(file.name)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) : '0'} KB • {new Date(file.created_at).toLocaleDateString()}
                                </span>
                            </>
                        )}
                      </div>
                    </div>
                    
                    {/* ACCIONES (Solo visibles si no estás editando) */}
                    {!isEditing && (
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => startEditing(e, file)}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-all" 
                                title="Renombrar archivo"
                            >
                                <Pencil size={16} />
                            </button>
                            
                            <button 
                                onClick={(e) => handleDelete(e, file.name)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" 
                                title="Eliminar archivo permanentemente"
                            >
                                <Trash2 size={16} />
                            </button>
                            
                            {/* Separador visual */}
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>

                            <button 
                                className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" 
                                title={isImg ? "Ver imagen" : "Descargar"}
                                onClick={(e) => {
                                    e.stopPropagation(); // Evitar doble evento
                                    handleViewFile(file);
                                }}
                            >
                                {isImg ? <Eye size={18} /> : <Download size={18} />}
                            </button>
                        </div>
                    )}
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