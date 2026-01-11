import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { Download, X, FileSpreadsheet, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function DataExportModal({ onClose }: { onClose: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleExport = async () => {
    setIsExporting(true);
    setProgress("Conectando con expediente...");

    try {
      // 1. Validar Sesión
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      // 2. EXTRACCIÓN PROFUNDA (Incluye 'summary')
      // Solicitamos explícitamente el resumen de la consulta
      const { data: patients, error } = await supabase
        .from('patients')
        .select(`
          id,
          created_at,
          name,
          phone,
          email,
          birth_date,
          gender,
          consultations (
             created_at,
             summary
          )
        `)
        .order('name');

      if (error) throw error;
      if (!patients || patients.length === 0) throw new Error("No hay pacientes para exportar.");

      setProgress(`Empaquetando ${patients.length} historias clínicas...`);

      // 3. APLANADO DE DATOS (FLATTENING)
      const csvData = patients.map(p => {
        // Encontrar la consulta más reciente para el backup
        // (Ordenamos en JS para asegurar precisión)
        const lastConsultation = p.consultations?.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const lastDate = lastConsultation 
            ? new Date(lastConsultation.created_at).toLocaleDateString() 
            : 'Sin historial';
            
        // AQUÍ ESTÁ LA CLAVE: Exportamos el texto real
        const lastSummary = lastConsultation?.summary || '';

        return {
          "ID Sistema": p.id,
          "Nombre Completo": p.name,
          "Teléfono": p.phone || "N/A",
          "Email": p.email || "",
          "Género": p.gender || "N/A",
          "Fecha Nacimiento": p.birth_date || "",
          "Fecha Registro": new Date(p.created_at || '').toLocaleDateString(),
          "Última Consulta": lastDate,
          "Resumen Clínico": lastSummary // Nueva columna vital para el Importador
        };
      });

      // 4. GENERACIÓN DE CSV BLINDADO (UTF-8 BOM + QUOTES)
      const csvString = Papa.unparse(csvData, {
          quotes: true,   // Importante: Protege el texto médico que tenga comas
          delimiter: ",", 
      });

      // Inyectar BOM para Excel
      const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Respaldo_Clinico_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Respaldo Clínico Completo Descargado");
      onClose();

    } catch (err: any) {
      console.error("Error exportando:", err);
      toast.error("Error: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Download className="text-blue-600" size={20}/> Respaldo Clínico
          </h2>
          <button onClick={onClose} disabled={isExporting} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18}/>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 text-blue-900 border border-blue-200 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block mb-1">Versión 2.1 (Full Data)</span>
              Este archivo incluye datos de contacto Y el resumen médico de la última consulta. Úselo para migrar pacientes entre cuentas.
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isExporting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {progress}
                </>
              ) : (
                <>
                  <FileSpreadsheet size={20} />
                  Descargar Respaldo Completo
                </>
              )}
            </button>
            
            <button onClick={onClose} disabled={isExporting} className="w-full py-2 text-slate-500 text-sm hover:text-slate-800 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}