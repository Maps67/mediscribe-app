import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { Upload, Database, X, ShieldCheck, Loader2, AlertTriangle, CheckCircle, FileText, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

// --- ESQUEMA DE VALIDACIÓN FLEXIBLE (ZOD) ---
const RawCsvRowSchema = z.object({
  Nombre: z.string().min(1, "El nombre es obligatorio"),
  // Aceptamos edad numérica o string fecha de nacimiento
  Edad: z.any().optional(),
  Nacimiento: z.string().optional(),
  Genero: z.string().optional(),
  Telefono: z.union([z.string(), z.number()]).optional(),
  Email: z.string().email().optional().or(z.literal("")),
  Transcripcion: z.string().optional(), 
  Fecha: z.string().optional(), 
});

// --- TIPOS DE BASE DE DATOS ---
interface PatientPayload {
  name: string;
  doctor_id: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  isTemporary: boolean; 
}

interface ConsultationPayload {
  doctor_id: string;
  patient_id: string;
  summary: string;
  transcript: string;
  status: 'completed';
  legal_status: 'migrated';
  created_at: string;
  ai_analysis_data: any;
}

export default function PatientImporter({ onComplete, onClose }: { onComplete?: () => void, onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ processed: number; patientsCreated: number; consultationsCreated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("");

  // --- HELPERS DE TRANSFORMACIÓN ---

  const calculateBirthDate = (ageInput: any, birthInput: string | undefined): string | undefined => {
    // Prioridad 1: Si viene fecha de nacimiento explícita (Formato Exportador VitalScribe)
    if (birthInput) {
        const d = new Date(birthInput);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }

    // Prioridad 2: Cálculo por edad
    if (!ageInput) return undefined;
    const s = String(ageInput).trim();
    if (["n/a", "na", "", "null"].includes(s.toLowerCase())) return undefined;

    const ageNum = parseInt(s.replace(/\D/g, ''), 10);
    
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - ageNum;
      return `${birthYear}-01-01`; 
    }
    return undefined;
  };

  const normalizeGender = (raw: string | undefined): string => {
    if (!raw) return "Otro";
    const g = raw.toLowerCase().trim();
    if (g.startsWith('m') || g.includes('masc')) return "Masculino";
    if (g.startsWith('f') || g.includes('fem') || g.includes('mujer')) return "Femenino";
    return "Otro";
  };

  const parseImportDate = (dateString: string | undefined): string => {
    if (!dateString || dateString.toLowerCase().includes('sin historial')) return new Date().toISOString();
    
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
        return d.toISOString();
    }
    return new Date().toISOString(); 
  };

  const sanitizeText = (text: string | undefined): string | null => {
    if (!text) return null;
    const clean = String(text).trim();
    if (clean === "" || ["N/A", "NA", "NULL", "undefined", "sin historial"].includes(clean.toUpperCase())) return null;
    return clean;
  };

  // --- MOTOR DE PROCESAMIENTO ---

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
      if (!user) throw new Error("Sesión expirada. Por favor recarga.");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8", // Asegurar lectura correcta de acentos
        complete: async (results) => {
          try {
            const rawRows: any[] = results.data;
            if (rawRows.length === 0) throw new Error("El CSV está vacío.");

            let patientsCount = 0;
            let consultationsCount = 0;
            let processedRows = 0;

            console.log(`[ETL V7.2] Iniciando migración INTELIGENTE de ${rawRows.length} filas...`);

            for (const row of rawRows) {
              processedRows++;
              
              // A. Normalización de claves (Mapeo Inteligente de Columnas)
              const normalizedRow: any = {};
              
              Object.keys(row).forEach(key => {
                const lower = key.toLowerCase().trim();
                const value = row[key];

                // 1. Detección de NOMBRE
                if (lower.includes('nombre') || lower.includes('name')) {
                    normalizedRow.Nombre = value;
                }
                // 2. Detección de EDAD vs NACIMIENTO
                else if (lower.includes('nacimiento') || lower.includes('birth')) {
                    normalizedRow.Nacimiento = value; // Captura fecha exacta
                }
                else if (lower.includes('edad') || lower.includes('age')) {
                    normalizedRow.Edad = value;
                }
                // 3. Detección de GÉNERO
                else if (lower.includes('genero') || lower.includes('sex') || lower.includes('género')) {
                    normalizedRow.Genero = value;
                }
                // 4. Contacto
                else if (lower.includes('tel') || lower.includes('phone') || lower.includes('cel')) {
                    normalizedRow.Telefono = value;
                }
                else if (lower.includes('mail') || lower.includes('email') || lower.includes('correo')) {
                    normalizedRow.Email = value;
                }
                // 5. Historial y Fechas
                else if (lower.includes('transcrip') || lower.includes('nota') || lower.includes('hist') || lower.includes('resumen')) {
                    normalizedRow.Transcripcion = value;
                }
                // IMPORTANTE: Distinguir fecha de consulta de fecha de nacimiento
                else if ((lower.includes('fecha') || lower.includes('date') || lower.includes('última') || lower.includes('ultima')) && !lower.includes('nacimiento') && !lower.includes('birth')) {
                    normalizedRow.Fecha = value;
                }
              });

              // B. Validación
              const parseResult = RawCsvRowSchema.safeParse(normalizedRow);
              if (!parseResult.success) {
                  console.warn(`Fila ${processedRows} inválida:`, parseResult.error);
                  continue; 
              }
              if (!parseResult.data.Nombre) continue;

              const data = parseResult.data;
              const cleanName = data.Nombre.trim();
              if (cleanName.length < 2) continue;

              setCurrentAction(`Procesando: ${cleanName}`);

              // --- PASO 1: PACIENTE ---
              const birthDate = calculateBirthDate(data.Edad, data.Nacimiento);
              const gender = normalizeGender(data.Genero);

              const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .upsert({
                    name: cleanName,
                    doctor_id: user.id,
                    email: data.Email || undefined,
                    phone: data.Telefono ? String(data.Telefono) : undefined,
                    birth_date: birthDate,
                    gender: gender,
                    isTemporary: false 
                }, { onConflict: 'doctor_id, name' })
                .select('id')
                .single();

              if (patientData) {
                  patientsCount++;
                  const patientId = patientData.id;

                  // --- PASO 2: HISTORIAL (INTELIGENTE) ---
                  // Si no hay texto de nota, pero hay fecha de "Última Consulta", creamos una nota de sistema.
                  
                  let clinicalNote = sanitizeText(data.Transcripcion);
                  const consultationDate = parseImportDate(data.Fecha);
                  let isSystemGenerated = false;

                  // Lógica VitalScribe Backup: Si importamos de un backup que solo tiene fechas
                  if (!clinicalNote && data.Fecha && !data.Fecha.toLowerCase().includes('sin historial')) {
                      clinicalNote = "Registro importado desde respaldo administrativo.";
                      isSystemGenerated = true;
                  }

                  if (clinicalNote) {
                      const consultationPayload: ConsultationPayload = {
                          doctor_id: user.id,
                          patient_id: patientId,
                          summary: clinicalNote,
                          transcript: isSystemGenerated ? "Backup Import" : "Importación de Datos Históricos",
                          status: 'completed',
                          legal_status: 'migrated',
                          created_at: consultationDate,
                          ai_analysis_data: {
                              clinicalNote: clinicalNote,
                              soapData: {
                                  subjective: `[HISTÓRICO] ${clinicalNote}`,
                                  objective: "No registrado en archivo original.",
                                  analysis: "Importación de datos.",
                                  plan: "Continuar seguimiento."
                              },
                              patientInstructions: "Consultar expediente físico si es necesario.",
                              risk_analysis: {
                                  level: 'Bajo',
                                  reason: "Registro histórico importado"
                              },
                              metadata: {
                                  origen: isSystemGenerated ? "VitalScribe Backup" : "Excel Externo",
                                  tipo: "Import"
                              }
                          }
                      };

                      const { error: consultError } = await supabase
                          .from('consultations')
                          .insert(consultationPayload);

                      if (!consultError) {
                          consultationsCount++;
                      }
                  }
              }
            }

            setStats({
              processed: processedRows,
              patientsCreated: patientsCount, 
              consultationsCreated: consultationsCount
            });
            
            toast.success("Migración exitosa.");
            if (onComplete) onComplete();

          } catch (err: any) {
            console.error("Error Lógico ETL V7.2:", err);
            setError(err.message || "Error procesando el archivo.");
            toast.error("Error crítico en migración.");
          } finally {
            setIsLoading(false);
            setCurrentAction("");
          }
        },
        error: (err) => {
           setIsLoading(false);
           setError(`Error de lectura CSV: ${err.message}`);
        }
      });

    } catch (e: any) {
      setIsLoading(false);
      setError(e.message);
    }
  };

  // --- INTERFAZ DE USUARIO ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-600"/> Migrador Universal v7.2
            </h2>
            <p className="text-xs text-slate-500 mt-1">Compatible con Excel Externo y Respaldos VitalScribe</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          
          <div className="bg-blue-50 text-blue-900 border border-blue-200 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Modo de Compatibilidad Activado</h4>
              <p className="text-xs mt-1">
                Este importador ha sido actualizado para leer tanto archivos Excel simples como los respaldos generados por el sistema ("ID Sistema", "Nombre Completo", "Última Consulta").
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
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full group-hover:scale-110 transition-transform">
                  {isLoading ? <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /> : <Upload className="w-8 h-8 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                    {isLoading ? "Analizando estructura..." : "Sube tu archivo CSV"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {isLoading ? currentAction : "Arrastra el archivo de respaldo o excel externo"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-6">
               <div className="grid grid-cols-3 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.processed}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filas Leídas</div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.patientsCreated}</div>
                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider">Pacientes Guardados</div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{stats.consultationsCreated}</div>
                    <div className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Historiales Generados</div>
                 </div>
               </div>
               
               <div className="flex justify-center">
                  <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                  >
                    Finalizar
                  </button>
               </div>
             </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3 text-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Error en la lectura</h4>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}