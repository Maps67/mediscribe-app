import React, { useState, useMemo } from 'react';
import { X, Printer, FileText, User, AlignLeft, FileCheck, Scissors, Calendar as CalendarIcon, Hash, Activity } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';

// Importamos los generadores de PDF
import PrescriptionPDF from './PrescriptionPDF';
import SurgicalLeavePDF from './SurgicalLeavePDF'; // 📦 PDF Quirúrgico existente

// Importamos el Generador de Lógica Quirúrgica (Reutilización Segura)
import SurgicalLeaveGenerator, { GeneratedLeaveData } from './SurgicalLeaveGenerator';

interface QuickDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfile: any;
  defaultType?: 'justificante' | 'certificado' | 'receta' | 'incapacidad';
}

export const QuickDocModal: React.FC<QuickDocModalProps> = ({ isOpen, onClose, doctorProfile, defaultType = 'justificante' }) => {
  const [docType, setDocType] = useState(defaultType);
  
  // --- ESTADOS DE FLUJO ---
  // Selector para diferenciar el flujo simple del flujo quirúrgico complejo
  const [incapacitySubtype, setIncapacitySubtype] = useState<'general' | 'surgical'>('general');

  // Datos Generales
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [content, setContent] = useState(''); // Para receta manual
  
  // Lógica de Incapacidad General / Justificante
  const [restDays, setRestDays] = useState('1');
  const [insuranceType, setInsuranceType] = useState('Enfermedad General');
  const [incapacityType, setIncapacityType] = useState('Inicial');
  const [folio, setFolio] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  
  const today = new Date();
  const todayLong = format(today, "d 'de' MMMM 'de' yyyy", { locale: es });

  // Cálculo Dinámico de Fechas (Solo para General)
  const dateRangeText = useMemo(() => {
    const days = parseInt(restDays) || 1;
    const endDate = addDays(today, days - 1); 
    return {
        start: format(today, "dd/MMM/yyyy", { locale: es }),
        end: format(endDate, "dd/MMM/yyyy", { locale: es })
    };
  }, [restDays]);

  // --- HANDLER A: IMPRESIÓN ESTÁNDAR (Justificante, Receta, Incapacidad General) ---
  const handlePrintStandard = async () => {
    if (!patientName) return toast.error("El nombre del paciente es obligatorio");
    
    setIsGenerating(true);
    const loadingToast = toast.loading("Generando documento oficial...");

    try {
        const titleMap = {
            'justificante': 'JUSTIFICANTE MÉDICO',
            'certificado': 'CERTIFICADO DE SALUD',
            'receta': 'RECETA MÉDICA',
            'incapacidad': 'CERTIFICADO DE INCAPACIDAD'
        };
        const finalTitle = titleMap[docType];

        let bodyText = "";

        if (docType === 'justificante') {
            bodyText = `A QUIEN CORRESPONDA:\n\n` +
            `El que suscribe, Médico Cirujano legalmente autorizado para ejercer la profesión, HACE CONSTAR que habiendo examinado al paciente ${patientName.toUpperCase()}${age ? ` de ${age} años de edad`:''}, se encontró con diagnóstico clínico de:\n\n` +
            `DIAGNÓSTICO: ${diagnosis.toUpperCase() || 'ENFERMEDAD GENERAL'}.\n\n` +
            `Por lo anterior, se determina que requiere de ${restDays} DÍAS de reposo para su recuperación y control médico, abarcando el periodo a partir de la fecha de expedición de este documento.\n\n` +
            `Se extiende la presente constancia a petición del interesado para los fines legales y administrativos que a este convengan.`;
        
        } else if (docType === 'certificado') {
            bodyText = `A QUIEN CORRESPONDA:\n\n` +
            `El que suscribe, Médico Cirujano legalmente autorizado, CERTIFICA que habiendo practicado un reconocimiento médico exhaustivo a ${patientName.toUpperCase()}${age ? ` de ${age} años de edad`:''}, al momento de la exploración lo he encontrado CLÍNICAMENTE SANO.\n\n` +
            `No se encontró evidencia de enfermedades infectocontagiosas activas, padecimientos crónico-degenerativos descompensados ni alteraciones psicomotrices que limiten sus facultades.\n\n` +
            `El paciente se encuentra APTO para realizar las actividades físicas, laborales o escolares requeridas.\n\n` +
            `Se extiende el presente certificado a solicitud del interesado para los usos que estime convenientes.`;
        
        } else if (docType === 'incapacidad') {
            // LÓGICA DE NEGOCIO: INCAPACIDAD GENERAL (NO QUIRÚRGICA)
            bodyText = `CERTIFICADO DE INCAPACIDAD TEMPORAL PARA EL TRABAJO\n\n` +
            `RAMO DE SEGURO: ${insuranceType.toUpperCase()}\n` +
            `TIPO DE INCAPACIDAD: ${incapacityType.toUpperCase()}\n` +
            `${folio ? `FOLIO INTERNO: ${folio.toUpperCase()}\n` : ''}\n` +
            `El médico que suscribe certifica que el paciente ${patientName.toUpperCase()}${age ? `, de ${age} años`:''}, presenta un estado de salud que le impide desempeñar su actividad laboral habitual debido a:\n\n` +
            `DIAGNÓSTICO (CIE-10): ${diagnosis.toUpperCase() || 'NO ESPECIFICADO'}\n\n` +
            `Por lo cual se expide la presente incapacidad por ${restDays} DÍAS, cubriendo el periodo del ${dateRangeText.start.toUpperCase()} al ${dateRangeText.end.toUpperCase()}.\n\n` +
            `Se extiende el presente documento bajo protesta de decir verdad y para los fines legales correspondientes.`;

        } else {
            bodyText = content || "Sin prescripciones agregadas.";
        }

        const rawName = doctorProfile?.full_name || '';
        const doctorNameForced = /^(Dr\.|Dra\.)/i.test(rawName) ? rawName : `Dr. ${rawName}`;

        const blob = await pdf(
            <PrescriptionPDF 
                doctorName={doctorNameForced}
                specialty={doctorProfile?.specialty || 'Medicina General'}
                license={doctorProfile?.license_number || ''}
                university={doctorProfile?.university || ''}
                phone={doctorProfile?.phone || ''}
                address={doctorProfile?.address || ''}
                logoUrl={doctorProfile?.logo_url}
                signatureUrl={doctorProfile?.signature_url}
                qrCodeUrl={doctorProfile?.qr_code_url}
                patientName={patientName}
                patientAge={age || ''}
                date={todayLong}
                documentTitle={finalTitle}
                content={bodyText}
            />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.dismiss(loadingToast);
        toast.success("Documento generado correctamente");
        onClose();

    } catch (error) {
        console.error(error);
        toast.error("Error al generar PDF");
    } finally {
        setIsGenerating(false);
    }
  };

  // --- HANDLER B: IMPRESIÓN QUIRÚRGICA (Invocado por SurgicalLeaveGenerator) ---
  const handleSurgicalPrint = async (data: GeneratedLeaveData) => {
      const loadingToast = toast.loading("Procesando Incapacidad Quirúrgica...");
      try {
        const blob = await pdf(
          <SurgicalLeavePDF 
            doctor={doctorProfile}
            patientName={patientName || "Paciente"} // Usa el nombre del estado local
            data={data}
            date={todayLong}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        toast.success("Incapacidad Post-Qx generada.");
        onClose();
      } catch (error) {
        console.error("Error PDF Qx:", error);
        toast.error("Error en módulo quirúrgico.");
      } finally {
        toast.dismiss(loadingToast);
      }
  };

  if (!isOpen) return null;

  const inputClass = "w-full border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-900 placeholder:text-slate-400 appearance-none";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${docType === 'incapacidad' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                {docType === 'incapacidad' ? <Scissors size={20}/> : <FileCheck size={20}/>}
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm">Generador de Documentos</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {docType === 'incapacidad' ? 'Legal • Laboral' : 'Clínico • Administrativo'}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {/* TABS DE NAVEGACIÓN */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto">
              {[
                  { id: 'justificante', label: 'Justificante', icon: FileText },
                  { id: 'certificado', label: 'Certificado', icon: FileCheck },
                  { id: 'receta', label: 'Receta', icon: AlignLeft },
                  { id: 'incapacidad', label: 'Incapacidad', icon: Scissors }
              ].map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setDocType(item.id as any)} 
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${docType === item.id ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <item.icon size={14} className={docType === item.id ? (item.id === 'incapacidad' ? 'text-purple-500' : 'text-teal-500') : ''} />
                  {item.label}
                </button>
              ))}
          </div>

          <div className="space-y-4">
              {/* CAMPO DE PACIENTE (Solo si NO es incapacidad quirúrgica, ya que el generador Qx tiene su propio header si se requiere, pero aquí lo mantenemos para consistencia inicial) */}
              {/* Si estamos en modo Qx, ocultamos estos inputs generales para que el Generador Qx tome el control visual, o los pasamos como props */}
              {(docType !== 'incapacidad' || incapacitySubtype === 'general') && (
                  <div className="grid grid-cols-4 gap-4 animate-fade-in">
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Paciente</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                type="text" 
                                value={patientName} 
                                onChange={e => setPatientName(e.target.value)} 
                                className={`${inputClass} pl-9 pr-4 py-2.5`} 
                                placeholder="Nombre completo..."
                            />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Edad</label>
                        <input 
                            type="text" 
                            value={age} 
                            onChange={e => setAge(e.target.value)} 
                            className={`${inputClass} px-3 py-2.5 font-medium`} 
                            placeholder="Ej. 32"
                        />
                      </div>
                  </div>
              )}

              {/* LÓGICA: JUSTIFICANTE */}
              {docType === 'justificante' && (
                <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Días de Reposo</label>
                    <input 
                        type="number" 
                        value={restDays} 
                        onChange={e => setRestDays(e.target.value)} 
                        className={`${inputClass} px-3 py-2 text-teal-800 text-center`} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Diagnóstico (CIE-10)</label>
                    <input 
                        type="text" 
                        value={diagnosis} 
                        onChange={e => setDiagnosis(e.target.value)} 
                        className={`${inputClass} px-3 py-2`} 
                        placeholder="Ej. Faringitis..."
                    />
                  </div>
                </div>
              )}

              {/* LÓGICA: INCAPACIDAD (HÍBRIDA) */}
              {docType === 'incapacidad' && (
                <div className="animate-fade-in">
                    {/* SELECTOR DE SUBTIPO */}
                    <div className="flex gap-4 mb-4 justify-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="incapacity_type" 
                                checked={incapacitySubtype === 'general'} 
                                onChange={() => setIncapacitySubtype('general')}
                                className="accent-purple-600 w-4 h-4"
                            />
                            <span className={`text-xs font-bold ${incapacitySubtype === 'general' ? 'text-purple-700' : 'text-slate-500'}`}>Enfermedad General</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="incapacity_type" 
                                checked={incapacitySubtype === 'surgical'} 
                                onChange={() => setIncapacitySubtype('surgical')}
                                className="accent-purple-600 w-4 h-4"
                            />
                            <span className={`text-xs font-bold ${incapacitySubtype === 'surgical' ? 'text-purple-700' : 'text-slate-500'}`}>Post-Quirúrgica</span>
                        </label>
                    </div>

                    {incapacitySubtype === 'general' ? (
                        /* --- MODO GENERAL (SIMPLE) --- */
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Ramo de Seguro</label>
                                    <select 
                                        value={insuranceType} 
                                        onChange={e => setInsuranceType(e.target.value)}
                                        className={`${inputClass} px-3 py-2 text-purple-900 bg-white cursor-pointer`}
                                    >
                                        <option value="Enfermedad General">Enfermedad General</option>
                                        <option value="Riesgo de Trabajo">Riesgo de Trabajo</option>
                                        <option value="Maternidad">Maternidad</option>
                                        <option value="Licencia 140 Bis">Licencia 140 Bis</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Tipo Incapacidad</label>
                                    <select 
                                        value={incapacityType} 
                                        onChange={e => setIncapacityType(e.target.value)}
                                        className={`${inputClass} px-3 py-2 text-purple-900 bg-white cursor-pointer`}
                                    >
                                        <option value="Inicial">Inicial</option>
                                        <option value="Subsecuente">Subsecuente</option>
                                        <option value="Recaída">Recaída</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Días Autorizados</label>
                                    <div className="relative">
                                        <CalendarIcon size={16} className="absolute left-3 top-2.5 text-purple-400"/>
                                        <input 
                                            type="number" 
                                            value={restDays} 
                                            onChange={e => setRestDays(e.target.value)} 
                                            className={`${inputClass} pl-9 pr-4 py-2 text-purple-900`} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Folio (Opcional)</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-3 top-2.5 text-purple-400"/>
                                        <input 
                                            type="text" 
                                            value={folio} 
                                            onChange={e => setFolio(e.target.value)} 
                                            className={`${inputClass} pl-9 pr-4 py-2`} 
                                            placeholder="Ej. AB-12345"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Periodo:</span>
                                <div className="text-sm font-bold text-purple-700 flex gap-2">
                                    <span>{dateRangeText.start}</span>
                                    <span className="text-purple-300">➜</span>
                                    <span>{dateRangeText.end}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Diagnóstico Clínico</label>
                                <input 
                                    type="text" 
                                    value={diagnosis} 
                                    onChange={e => setDiagnosis(e.target.value)} 
                                    className={`${inputClass} px-3 py-2`} 
                                    placeholder="Ej. J00X Rinitis Aguda"
                                />
                            </div>
                        </div>
                    ) : (
                        /* --- MODO QUIRÚRGICO (REUTILIZACIÓN SEGURA) --- */
                        /* Aquí incrustamos el componente existente sin modificar su código fuente */
                        <div className="border border-indigo-100 rounded-xl overflow-hidden animate-fade-in">
                            <div className="bg-indigo-50 px-4 py-2 flex items-center gap-2 text-indigo-700 text-xs font-bold border-b border-indigo-100">
                                <Activity size={14}/> Módulo Avanzado Post-Qx
                            </div>
                            <div className="p-2">
                                {patientName ? (
                                    <SurgicalLeaveGenerator 
                                        patientName={patientName}
                                        onClose={() => {}} // No-op, el control lo tiene el modal padre
                                        onGenerate={handleSurgicalPrint} // Puenteamos la salida al generador de PDF
                                    />
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        Por favor ingrese el nombre del paciente arriba para activar el módulo quirúrgico.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
              )}

              {/* LÓGICA: RECETA */}
              {docType === 'receta' && (
                <div className="animate-fade-in">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1"><AlignLeft size={12} className="inline mr-1"/>Prescripción Manual</label>
                   <textarea 
                       value={content} 
                       onChange={e => setContent(e.target.value)} 
                       className={`${inputClass} w-full p-4 h-40 leading-relaxed resize-none font-mono`} 
                       placeholder="Escriba medicamentos e indicaciones..."
                   />
                </div>
              )}
          </div>
        </div>

        {/* Footer (Solo visible si NO estamos en modo quirúrgico o si es otro docType, 
            ya que SurgicalLeaveGenerator tiene su propio botón de acción) */}
        {(docType !== 'incapacidad' || incapacitySubtype === 'general') && (
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
            <button onClick={onClose} className="px-4 py-2.5 text-slate-500 font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all text-xs">Cancelar</button>
            <button 
                    onClick={handlePrintStandard} 
                    disabled={isGenerating} 
                    className={`px-6 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all text-xs disabled:opacity-70 ${docType === 'incapacidad' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                {isGenerating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Printer size={16} />}
                {isGenerating ? 'GENERANDO PDF...' : 'IMPRIMIR OFICIAL'}
            </button>
            </div>
        )}
      </div>
    </div>
  );
};