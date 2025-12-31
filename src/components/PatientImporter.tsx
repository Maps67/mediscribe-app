import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { Upload, ArrowRight, AlertTriangle, FileSpreadsheet, Database, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// DEFINICIÓN DE CAMPOS CON TIPADO ESTRICTO
// Agregamos la propiedad 'type' para saber cómo limpiar cada dato
const REQUIRED_FIELDS = [
  { key: 'name', label: 'Nombre Completo (Obligatorio)', required: true, type: 'text' },
  { key: 'phone', label: 'Teléfono', required: false, type: 'text' },
  { key: 'email', label: 'Correo Electrónico', required: false, type: 'text' },
  { key: 'birth_date', label: 'Fecha de Nacimiento (YYYY-MM-DD)', required: false, type: 'date' }, // TIPO DATE
  { key: 'allergies', label: 'Alergias', required: false, type: 'text' },
  { key: 'history', label: 'Antecedentes (Enfermedades/Cirugías)', required: false, type: 'text' },
  { key: 'clinical_note', label: 'Notas de Última Consulta / Contexto', required: false, type: 'text' },
];

interface PatientImporterProps {
    onComplete: () => void;
    onClose: () => void;
}

const PatientImporter: React.FC<PatientImporterProps> = ({ onComplete, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawFile, setRawFile] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  // --- FUNCIÓN DE SANITIZACIÓN (EL BLINDAJE) ---
  const cleanDateValue = (value: any): string | null => {
    if (!value) return null;
    const str = String(value).trim();
    
    // Lista negra de valores que rompen PostgreSQL
    const invalidValues = ['N/A', 'n/a', 'NA', 'na', 'No aplica', 'error', 'null', 'undefined'];
    if (invalidValues.includes(str) || str === '') return null;

    // Intento de parseo de fecha estándar
    const date = new Date(str);
    if (isNaN(date.getTime())) {
        console.warn(`Fecha inválida detectada e ignorada: ${str}`);
        return null; // Si no es fecha válida, retornar null para evitar crash
    }

    // Retornar formato ISO estricto (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  };

  // 1. CARGA Y PARSEO DEL ARCHIVO
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setFileHeaders(results.meta.fields);
          setRawFile(results.data);
          setStep(2); 
          toast.success(`Archivo cargado: ${results.data.length} registros detectados`);
        } else {
            toast.error("El archivo parece estar vacío o no tiene encabezados.");
        }
      },
      error: (err: any) => toast.error("Error leyendo archivo: " + err.message)
    });
  };

  const handleMapChange = (vitalScribeField: string, userColumn: string) => {
    setMapping(prev => ({ ...prev, [vitalScribeField]: userColumn }));
  };

  // 3. PROCESAMIENTO E INSERCIÓN BLINDADA
  const executeImport = async () => {
    try {
      setImporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const formattedPatients = rawFile.map(row => {
        const patient: any = { doctor_id: user.id, created_at: new Date() };
        
        // Variables para contexto
        let tempHistory = "";
        let tempNotes = "";
        let hasName = false;

        Object.keys(mapping).forEach(vkKey => {
          const userCol = mapping[vkKey];
          // Buscar la definición del campo para saber su tipo
          const fieldDef = REQUIRED_FIELDS.find(f => f.key === vkKey);

          if (userCol && row[userCol]) {
            let val = row[userCol];
            
            // --- APLICACIÓN DE SANITIZACIÓN SEGÚN TIPO ---
            if (fieldDef?.type === 'date') {
                // Si el campo destino es FECHA, usamos el limpiador estricto
                const cleanDate = cleanDateValue(val);
                if (cleanDate) {
                    patient[vkKey] = cleanDate;
                }
                // Nota: Si cleanDate es null (ej. era "N/A"), simplemente no asignamos nada a patient[vkKey]
                // Supabase lo tomará como NULL automáticamente sin dar error.
            } else {
                // Si es TEXTO, solo limpiamos espacios y convertimos a string
                val = val.toString().trim();
                
                if (val) {
                    if (vkKey === 'history') {
                        tempHistory = val;
                    } else if (vkKey === 'clinical_note') {
                        tempNotes = val;
                    } else {
                        patient[vkKey] = val;
                    }
                    if (vkKey === 'name') hasName = true;
                }
            }
          }
        });

        if (!hasName) return null;
        
        // CONSTRUCCIÓN DEL JSON DE CONTEXTO
        // Aquí sí podemos guardar datos "sucios" o texto libre sin romper la BD
        const contextObject = {
            antecedentes: tempHistory || "No especificados",
            evolucion_previa: tempNotes || "Sin notas previas",
            // Agregamos metadatos extra si existen en el Excel original para no perder info
            importacion: {
                fecha: new Date().toISOString().split('T')[0],
                origen: 'Migración Excel'
            }
        };

        patient.history = JSON.stringify(contextObject);

        return patient;
      }).filter(p => p !== null);

      if (formattedPatients.length === 0) throw new Error("No se encontraron datos válidos.");

      const { error } = await supabase.from('patients').insert(formattedPatients);

      if (error) throw error;

      toast.success(`${formattedPatients.length} pacientes importados correctamente.`);
      onComplete();
      setRawFile([]);
      setMapping({});
      onClose();

    } catch (error: any) {
      console.error(error);
      // Mensaje de error más amigable
      if (error.message?.includes('invalid input syntax')) {
          toast.error("Error de formato: Algún dato no coincide con el tipo esperado (Fecha/Número).");
      } else {
          toast.error("Error en importación: " + error.message);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={24}/>
            </button>

            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <Database size={24} className="text-indigo-600"/> 
                Asistente de Migración Inteligente
            </h3>

            {step === 1 && (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group cursor-pointer">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full group-hover:scale-110 transition-transform">
                            <FileSpreadsheet size={40} className="text-indigo-500"/>
                        </div>
                    </div>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Sube tu archivo de Pacientes</p>
                    <p className="text-sm text-slate-500 mt-2 mb-6">El sistema detectará y limpiará automáticamente errores como "N/A" en fechas.</p>
                    
                    <div className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md group-hover:bg-indigo-700 pointer-events-none">
                        Seleccionar Archivo CSV
                    </div>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3 border border-amber-100 dark:border-amber-800">
                        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600"/>
                        <div>
                            <p className="font-bold">Aviso sobre Fechas</p>
                            <p className="opacity-90">
                                Si tu Excel tiene textos como "N/A" o celdas vacías en fechas, el sistema las convertirá a "Sin Dato" automáticamente para evitar errores.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {REQUIRED_FIELDS.map((field) => (
                        <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 gap-3">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${field.required ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {field.label}
                                    </span>
                                    {field.type === 'date' && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono">FECHA</span>}
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Campo Destino</span>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-1 sm:justify-end">
                                <ArrowRight size={16} className="text-slate-300 hidden sm:block"/>
                                <select 
                                    className="w-full sm:w-64 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                                    onChange={(e) => handleMapChange(field.key, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- Seleccionar columna --</option>
                                    {fileHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                        <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Atrás</button>
                        <button 
                            onClick={executeImport} 
                            disabled={importing || !mapping['name']} 
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
                        >
                            {importing ? <RefreshCw className="animate-spin" size={18}/> : <Upload size={18}/>}
                            {importing ? 'Importando...' : `Importar ${rawFile.length} Pacientes`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PatientImporter;