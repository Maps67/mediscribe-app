import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Phone, MapPin, Activity, Heart, 
  Dna, Baby, FileText, ChevronDown, ChevronRight, 
  AlertTriangle, Save, ArrowRight, ArrowLeft, Shield
} from 'lucide-react';
import { toast } from 'sonner';

// --- TIPOS INTERNOS DEL WIZARD ---
export interface WizardData {
  // Identificación
  name: string;
  dob: string;
  age: string;
  gender: string;
  curp: string;
  maritalStatus: string;
  occupation: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  allergies: string; // CRÍTICO

  // Antecedentes (Se guardarán en JSON)
  pathological: { chronic: string; surgeries: string; hospital: string; meds: string; };
  nonPathological: { smoking: string; alcohol: string; drugs: string; exercise: string; };
  family: { diabetes: boolean; hypertension: boolean; cancer: boolean; heart: boolean; other: string };
  obgyn: { menarche: string; cycle: string; fum: string; gpac: string; contraceptive: string; };

  // Administrativo
  insurance: string;
  rfc: string;
  invoice: boolean;
  patientType: 'Nuevo' | 'Recurrente';
  referral: string;
}

interface PatientWizardProps {
  initialData?: Partial<WizardData>;
  onClose: () => void;
  onSave: (data: WizardData) => Promise<void>;
}

// --- COMPONENTE ACORDEÓN REUTILIZABLE ---
const AccordionItem = ({ title, icon: Icon, children, isOpen, onClick }: any) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-2 overflow-hidden bg-white dark:bg-slate-800">
    <button 
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isOpen ? 'bg-slate-50 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
    >
      <div className="flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-200">
        <Icon size={18} className="text-brand-teal" />
        {title}
      </div>
      {isOpen ? <ChevronDown size={18} className="text-slate-400"/> : <ChevronRight size={18} className="text-slate-400"/>}
    </button>
    {isOpen && <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 animate-fade-in">{children}</div>}
  </div>
);

export const PatientWizard: React.FC<PatientWizardProps> = ({ initialData, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string>('pathological'); // Acordeón abierto por default

  const [formData, setFormData] = useState<WizardData>({
    name: '', dob: '', age: '', gender: 'Masculino', curp: '', maritalStatus: 'Soltero',
    occupation: '', phone: '', email: '', address: '', emergencyContact: '', allergies: '',
    pathological: { chronic: '', surgeries: '', hospital: '', meds: '' },
    nonPathological: { smoking: 'Negado', alcohol: 'Ocasional', drugs: 'Negado', exercise: 'Sedentario' },
    family: { diabetes: false, hypertension: false, cancer: false, heart: false, other: '' },
    obgyn: { menarche: '', cycle: '', fum: '', gpac: '', contraceptive: '' },
    insurance: '', rfc: '', invoice: false, patientType: 'Nuevo', referral: ''
  });

  // Cargar datos si es edición
  useEffect(() => {
    if (initialData) {
        setFormData(prev => ({ ...prev, ...initialData, name: initialData.name || '' }));
    }
  }, [initialData]);

  // Cálculo Automático de Edad
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.dob]);

  const handleChange = (section: keyof WizardData | null, field: string, value: any) => {
    if (section && typeof formData[section] === 'object') {
      setFormData(prev => ({ ...prev, [section]: { ...(prev[section] as object), [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) { toast.error("El nombre es obligatorio"); return false; }
    if (!formData.gender) { toast.error("El género es obligatorio"); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(prev => prev + 1);
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
        await onSave(formData);
    } catch (e) {
        console.error(e);
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER WIZARD */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {step === 1 && <User className="text-brand-teal"/>}
                {step === 2 && <Activity className="text-brand-teal"/>}
                {step === 3 && <FileText className="text-brand-teal"/>}
                {step === 1 ? "Identificación" : step === 2 ? "Antecedentes Clínicos" : "Administrativo"}
            </h2>
            <div className="flex gap-1 mt-1">
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-brand-teal' : 'bg-slate-200'}`}/>
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-brand-teal' : 'bg-slate-200'}`}/>
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 3 ? 'bg-brand-teal' : 'bg-slate-200'}`}/>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
            <span className="sr-only">Cerrar</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* BODY SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        
        {/* --- PASO 1: IDENTIFICACIÓN --- */}
        {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* Alergias - RESALTADO IMPORTANTE */}
                <div className="col-span-1 md:col-span-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-1" />
                    <div className="w-full">
                        <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-1">Alergias Críticas (Obligatorio)</label>
                        <input 
                            value={formData.allergies}
                            onChange={(e) => handleChange(null, 'allergies', e.target.value)}
                            placeholder="Escriba 'NEGADAS' o liste las alergias..."
                            className="w-full bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="label-modern">Nombre Completo</label>
                    <input className="input-modern" value={formData.name} onChange={(e) => handleChange(null, 'name', e.target.value)} placeholder="Ej. Juan Pérez" autoFocus />
                </div>
                
                <div>
                    <label className="label-modern">Género</label>
                    <select className="input-modern" value={formData.gender} onChange={(e) => handleChange(null, 'gender', e.target.value)}>
                        <option>Masculino</option><option>Femenino</option><option>No Binario</option>
                    </select>
                </div>

                <div>
                    <label className="label-modern">Fecha Nacimiento</label>
                    <input type="date" className="input-modern" value={formData.dob} onChange={(e) => handleChange(null, 'dob', e.target.value)} />
                </div>

                <div>
                    <label className="label-modern">Edad</label>
                    <input className="input-modern bg-slate-100 dark:bg-slate-800" value={formData.age} readOnly placeholder="Auto" />
                </div>

                <div>
                    <label className="label-modern">Teléfono</label>
                    <input className="input-modern" value={formData.phone} onChange={(e) => handleChange(null, 'phone', e.target.value)} type="tel" />
                </div>

                <div>
                    <label className="label-modern">Email</label>
                    <input className="input-modern" value={formData.email} onChange={(e) => handleChange(null, 'email', e.target.value)} type="email" />
                </div>

                <div>
                    <label className="label-modern">Ocupación</label>
                    <input className="input-modern" value={formData.occupation} onChange={(e) => handleChange(null, 'occupation', e.target.value)} />
                </div>

                <div>
                    <label className="label-modern">Estado Civil</label>
                    <select className="input-modern" value={formData.maritalStatus} onChange={(e) => handleChange(null, 'maritalStatus', e.target.value)}>
                        <option>Soltero</option><option>Casado</option><option>Divorciado</option><option>Viudo</option><option>Unión Libre</option>
                    </select>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                    <label className="label-modern">Dirección</label>
                    <input className="input-modern" value={formData.address} onChange={(e) => handleChange(null, 'address', e.target.value)} placeholder="Calle, Número, Colonia..." />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                    <label className="label-modern">Contacto de Emergencia (Nombre y Teléfono)</label>
                    <input className="input-modern" value={formData.emergencyContact} onChange={(e) => handleChange(null, 'emergencyContact', e.target.value)} placeholder="Ej. Maria Lopez (Esposa) - 555..." />
                </div>
            </div>
        )}

        {/* --- PASO 2: ANTECEDENTES CLÍNICOS --- */}
        {step === 2 && (
            <div className="space-y-4 animate-fade-in">
                
                {/* A) PATOLÓGICOS */}
                <AccordionItem title="Antecedentes Patológicos" icon={Activity} isOpen={openSection === 'pathological'} onClick={() => setOpenSection(openSection === 'pathological' ? '' : 'pathological')}>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="label-modern">Enfermedades Crónicas</label>
                            <textarea className="input-modern h-20" placeholder="Diabetes, Hipertensión, etc..." value={formData.pathological.chronic} onChange={(e) => handleChange('pathological', 'chronic', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label-modern">Cirugías Previas</label>
                                <input className="input-modern" value={formData.pathological.surgeries} onChange={(e) => handleChange('pathological', 'surgeries', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-modern">Hospitalizaciones</label>
                                <input className="input-modern" value={formData.pathological.hospital} onChange={(e) => handleChange('pathological', 'hospital', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="label-modern">Medicamentos Actuales</label>
                            <input className="input-modern" placeholder="Nombre, dosis y frecuencia" value={formData.pathological.meds} onChange={(e) => handleChange('pathological', 'meds', e.target.value)} />
                        </div>
                    </div>
                </AccordionItem>

                {/* B) NO PATOLÓGICOS */}
                <AccordionItem title="No Patológicos (Estilo de Vida)" icon={User} isOpen={openSection === 'nonPathological'} onClick={() => setOpenSection(openSection === 'nonPathological' ? '' : 'nonPathological')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-modern">Tabaquismo</label>
                            <select className="input-modern" value={formData.nonPathological.smoking} onChange={(e) => handleChange('nonPathological', 'smoking', e.target.value)}>
                                <option>Negado</option><option>Ocasional</option><option>Frecuente</option><option>Ex-fumador</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-modern">Alcoholismo</label>
                            <select className="input-modern" value={formData.nonPathological.alcohol} onChange={(e) => handleChange('nonPathological', 'alcohol', e.target.value)}>
                                <option>Negado</option><option>Ocasional</option><option>Frecuente</option><option>Social</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-modern">Actividad Física</label>
                            <input className="input-modern" placeholder="Ej. 3 veces por semana" value={formData.nonPathological.exercise} onChange={(e) => handleChange('nonPathological', 'exercise', e.target.value)} />
                        </div>
                    </div>
                </AccordionItem>

                {/* C) HEREDOFAMILIARES */}
                <AccordionItem title="Antecedentes Heredofamiliares" icon={Dna} isOpen={openSection === 'family'} onClick={() => setOpenSection(openSection === 'family' ? '' : 'family')}>
                    <div className="flex flex-wrap gap-4 mb-4">
                        {['Diabetes', 'Hipertensión', 'Cáncer', 'Cardiopatías'].map((cond) => (
                            <label key={cond} className="flex items-center gap-2 border px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700">
                                <input 
                                    type="checkbox" 
                                    className="accent-brand-teal w-4 h-4"
                                    onChange={(e) => {}} 
                                />
                                <span className="text-sm font-medium dark:text-slate-300">{cond}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="label-modern">Detalles Adicionales</label>
                        <input className="input-modern" placeholder="Especifique familiares (Madre, Padre...)" value={formData.family.other} onChange={(e) => handleChange('family', 'other', e.target.value)} />
                    </div>
                </AccordionItem>

                {/* D) GINECO-OBSTETRICOS (CONDICIONAL) */}
                {formData.gender === 'Femenino' && (
                    <AccordionItem title="Gineco-Obstétricos" icon={Baby} isOpen={openSection === 'obgyn'} onClick={() => setOpenSection(openSection === 'obgyn' ? '' : 'obgyn')}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="label-modern">Menarquia</label><input className="input-modern" value={formData.obgyn.menarche} onChange={e => handleChange('obgyn', 'menarche', e.target.value)}/></div>
                            <div><label className="label-modern">Ciclo</label><input className="input-modern" placeholder="28/4" value={formData.obgyn.cycle} onChange={e => handleChange('obgyn', 'cycle', e.target.value)}/></div>
                            <div><label className="label-modern">FUM</label><input type="date" className="input-modern" value={formData.obgyn.fum} onChange={e => handleChange('obgyn', 'fum', e.target.value)}/></div>
                            <div><label className="label-modern">G/P/A/C</label><input className="input-modern" placeholder="G0 P0 A0 C0" value={formData.obgyn.gpac} onChange={e => handleChange('obgyn', 'gpac', e.target.value)}/></div>
                            <div className="col-span-2"><label className="label-modern">Método Anticonceptivo</label><input className="input-modern" value={formData.obgyn.contraceptive} onChange={e => handleChange('obgyn', 'contraceptive', e.target.value)}/></div>
                        </div>
                    </AccordionItem>
                )}
            </div>
        )}

        {/* --- PASO 3: ADMINISTRATIVO --- */}
        {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="col-span-1 md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 border border-blue-100 dark:border-blue-900/30">
                    <Shield className="text-blue-500 mt-1"/>
                    <div>
                        <h4 className="font-bold text-blue-700 dark:text-blue-300">Datos Administrativos</h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Información para facturación y reportes.</p>
                    </div>
                </div>

                <div>
                    <label className="label-modern">Tipo de Paciente</label>
                    <select className="input-modern" value={formData.patientType} onChange={(e) => handleChange(null, 'patientType', e.target.value)}>
                        <option>Nuevo</option><option>Recurrente</option>
                    </select>
                </div>

                <div>
                    <label className="label-modern">Seguro Médico</label>
                    <input className="input-modern" placeholder="Aseguradora / Póliza" value={formData.insurance} onChange={(e) => handleChange(null, 'insurance', e.target.value)} />
                </div>

                <div>
                    <label className="label-modern">RFC</label>
                    <input className="input-modern" placeholder="Para facturación" value={formData.rfc} onChange={(e) => handleChange(null, 'rfc', e.target.value)} />
                </div>

                <div className="flex items-center mt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-brand-teal" checked={formData.invoice} onChange={(e) => handleChange(null, 'invoice', e.target.checked)} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">¿Requiere Factura?</span>
                    </label>
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="label-modern">Medio de Referencia</label>
                    <input className="input-modern" placeholder="¿Cómo se enteró de nosotros?" value={formData.referral} onChange={(e) => handleChange(null, 'referral', e.target.value)} />
                </div>
            </div>
        )}

      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between">
        {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                <ArrowLeft size={18} /> Atrás
            </button>
        ) : (
            <button onClick={onClose} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                Cancelar
            </button>
        )}

        {step < 3 ? (
            <button onClick={handleNext} className="px-8 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-md transition-all">
                Siguiente <ArrowRight size={18} />
            </button>
        ) : (
            <button onClick={handleFinalSave} disabled={isSaving} className="px-8 py-2 bg-brand-teal text-white rounded-lg font-bold flex items-center gap-2 hover:bg-teal-600 shadow-lg shadow-teal-500/30 transition-all">
                {isSaving ? <Activity className="animate-spin" /> : <Save size={18} />} Guardar Expediente
            </button>
        )}
      </div>

      <style>{`
        .label-modern { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1; }
        .input-modern { @apply w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all font-medium; }
      `}</style>
    </div>
  );
};