import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { Upload, Database, X, ShieldCheck, Loader2, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

// --- TIPOS Y ESQUEMAS ---

interface Patient {
  name: string;
  doctor_id: string;
  history?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  created_at?: string;
}

const RawCsvRowSchema = z.object({
  Nombre: z.string().min(1, "El nombre es obligatorio"),
  Edad: z.union([z.string(), z.number()]).optional(),
  Telefono: z.union([z.string(), z.number()]).optional(),
  Email: z.string().email().optional().or(z.literal("")),
  Transcripcion: z.string().optional(),
  Fecha: z.string().optional(),
});

interface AggregatedPatient {
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  historyEvents: string[];
}

export default function PatientImporter({ onComplete, onClose }: { onComplete?: () => void, onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ processed: number; success: number; merged: number; notesFound: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- LÓGICA DE NEGOCIO ---

  const calculateBirthDate = (ageInput: string | number | undefined): string | undefined => {
    if (!ageInput) return undefined;
    const s = String(ageInput).trim();
    if (["n/a", "na", "", "null"].includes(s.toLowerCase())) return undefined;

    const ageNum = parseInt(s.replace(/\D/g, ''), 10);
    
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - ageNum;
      return `${birthYear}-01-01`; 
    }
    
    const d = Date.parse(s);
    return !isNaN(d) ? new Date(d).toISOString().split('T')[0] : undefined;
  };

  const sanitizeHistoryText = (text: string | undefined): string | null => {
    if (!text) return null;
    const clean = String(text).trim();
    // Filtros más agresivos para evitar basura en el historial
    if (clean === "" || ["N/A", "NA", "NULL", "UNDEFINED", "ERROR", "ERROR AL GENERAR"].includes(clean.toUpperCase())) return null;
    if (clean.length < 5) return null; // Ignorar textos muy cortos
    return clean;
  };

  // --- PROCESAMIENTO ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setStats(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada. Por favor recarga la página.");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8", // Forzar UTF-8 para caracteres latinos
        complete: async (results) => {
          try {
            const rawRows: any[] = results.data;
            if (rawRows.length === 0) throw new Error("El archivo CSV está vacío.");

            const patientMap = new Map<string, AggregatedPatient>();
            let processedRows = 0;
            let totalNotesFound = 0;

            console.log(`[ETL Prod] Procesando ${rawRows.length} filas...`);

            for (const row of rawRows) {
              const normalizedRow: any = {};
              
              // Mapeo Inteligente de Columnas (Case Insensitive + Trimming)
              Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim();
                const value = row[key];

                if (cleanKey.includes('nombre') || cleanKey.includes('name') || cleanKey === 'paciente') normalizedRow.Nombre = value;
                else if (cleanKey.includes('edad') || cleanKey.includes('age') || cleanKey.includes('birth')) normalizedRow.Edad = value;
                else if (cleanKey.includes('tel') || cleanKey.includes('phone') || cleanKey.includes('cel')) normalizedRow.Telefono = value;
                else if (cleanKey.includes('mail') || cleanKey.includes('correo')) normalizedRow.Email = value;
                else if (cleanKey.includes('transcrip') || cleanKey.includes('nota') || cleanKey.includes('hist') || cleanKey.includes('resumen') || cleanKey.includes('consulta')) normalizedRow.Transcripcion = value;
                else if (cleanKey.includes('fecha') || cleanKey.includes('date')) normalizedRow.Fecha = value;
              });

              const parseResult = RawCsvRowSchema.safeParse(normalizedRow);
              if (!parseResult.success || !parseResult.data.Nombre) continue;

              const data = parseResult.data;
              const originalName = data.Nombre.trim();
              
              if (originalName.length < 2) continue; 

              processedRows++;

              // FIX: Normalización de llave para deduplicación estricta
              const normalizedKey = originalName.toLowerCase();

              const birthDate = calculateBirthDate(data.Edad);
              const note = sanitizeHistoryText(data.Transcripcion);
              const eventDate = data.Fecha ? String(data.Fecha).split('T')[0] : new Date().toISOString().split('T')[0];

              if (note) totalNotesFound++;

              if (patientMap.has(normalizedKey)) {
                const existing = patientMap.get(normalizedKey)!;
                if (note) {
                   // Evitar duplicar exactamente la misma nota
                   if (!existing.historyEvents.some(h => h.includes(note))) {
                       existing.historyEvents.push(`📅 CITA IMPORTADA (${eventDate}):\n${note}`);
                   }
                }
                if (!existing.email && data.Email) existing.email = data.Email;
                if (!existing.phone && data.Telefono) existing.phone = String(data.Telefono);
                if (!existing.birth_date && birthDate) existing.birth_date = birthDate;
              } else {
                patientMap.set(normalizedKey, {
                  name: originalName,
                  email: data.Email || "",
                  phone: data.Telefono ? String(data.Telefono) : "",
                  birth_date: birthDate || "",
                  historyEvents: note ? [`📅 CITA IMPORTADA (${eventDate}):\n${note}`] : []
                });
              }
            }

            const patientsToUpsert: Patient[] = Array.from(patientMap.values()).map(p => {
              // FIX: Estructura compatible con "SOAP" para forzar visualización
              // Usamos el campo 'subjective' que es estándar en la mayoría de vistas
              const fullHistoryText = p.historyEvents.length > 0 
                  ? p.historyEvents.join("\n\n----------------------------------------\n\n") 
                  : "Sin historial previo detallado en el archivo.";

              const historyJson = JSON.stringify({
                origen: "Importación Masiva ETL (v5.4)",
                subjective: fullHistoryText, // Clave compatible con SOAP UI
                resumen_clinico: fullHistoryText // Respaldo
              });

              return {
                name: p.name,
                email: p.email || undefined,
                phone: p.phone || undefined,
                birth_date: p.birth_date || undefined,
                history: historyJson,
                doctor_id: user.id,
                created_at: new Date().toISOString()
              };
            });

            if (patientsToUpsert.length === 0) throw new Error("No se generaron pacientes válidos. Revisa las columnas del CSV.");

            const { error: upsertError } = await supabase
              .from('patients')
              .upsert(patientsToUpsert, { 
                onConflict: 'doctor_id, name', 
                ignoreDuplicates: false 
              });

            if (upsertError) throw upsertError;

            setStats({
              processed: processedRows,
              merged: processedRows - patientsToUpsert.length,
              success: patientsToUpsert.length,
              notesFound: totalNotesFound
            });
            
            toast.success("Importación completada. Historiales fusionados.");
            if (onComplete) onComplete();

          } catch (err: any) {
            console.error("Error ETL:", err);
            setError(err.message || "Error procesando el archivo.");
            toast.error("Error en la importación.");
          } finally {
            setIsLoading(false);
          }
        },
        error: (err) => {
           setIsLoading(false);
           setError(`Error leyendo CSV: ${err.message}`);
        }
      });

    } catch (e: any) {
      setIsLoading(false);
      setError(e.message);
    }
  };

  // --- UI ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-emerald-600"/> Importador ETL v5.4
            </h2>
            <p className="text-xs text-slate-500 mt-1">Deduplicación + Mapeo Universal SOAP</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          
          <div className="bg-blue-50 text-blue-900 border border-blue-200 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Garantía de Integridad</h4>
              <p className="text-xs mt-1">
                El sistema fusionará múltiples filas del mismo paciente en un solo expediente cronológico.
                <br/>
                El historial se guardará en formato <strong>SOAP (Subjetivo)</strong> para asegurar su visibilidad.
              </p>
            </div>
          </div>

          {!stats ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full group-hover:scale-110 transition-transform">
                  {isLoading ? <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /> : <Upload className="w-8 h-8 text-emerald-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Sube tu archivo CSV</h3>
                  <p className="text-sm text-slate-500 mt-1">Detecta automáticamente: Nombre, Transcripción/Resumen/Nota</p>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-6">
               <div className="grid grid-cols-4 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.processed}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filas</div>
                 </div>
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                    <div className="text-2xl font-bold text-amber-700">{stats.merged}</div>
                    <div className="text-xs text-amber-600 uppercase font-bold tracking-wider">Fusionados</div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.notesFound}</div>
                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider flex justify-center items-center gap-1">
                        <FileText size={12}/> Notas
                    </div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{stats.success}</div>
                    <div className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Pacientes</div>
                 </div>
               </div>
               
               <div className="flex justify-center">
                  <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                  >
                    Finalizar Importación
                  </button>
               </div>
             </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3 text-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Error</h4>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}