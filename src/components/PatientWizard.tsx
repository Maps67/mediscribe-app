import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Phone, MapPin, Activity, AlertTriangle, 
  Save, X, ShieldAlert, FileText, HeartPulse 
} from 'lucide-react';
import { toast } from 'sonner';

// --- TIPOS DE DATOS ---
export interface WizardData {
  // Identificación
  name: string;
  dob: string;
  age: string;
  gender: string;
  curp: string; // Opcional según requerimiento
  maritalStatus: string;
  
  // Contacto
  phone: string;
  email: string;
  address: string;
  occupation: string;
  emergencyContact: string; // Nombre + Teléfono
  
  // Clínico Crítico
  allergies: string; // OBLIGATORIO
  nonCriticalAllergies: string;
  background: string; // Antecedentes relevantes
  notes: string; // Observaciones
  
  // Estructura interna para compatibilidad con base de datos
  // (Estos se llenan por defecto o se expanden en edición futura)
  pathological?: any;
  nonPathological?: any;
  family?: any;
  obgyn?: any;
  insurance?: string;
  rfc?: string;
  invoice?: boolean;
  patientType?: string;
  referral?: string;
}

interface PatientWizardProps {
  initialData?: Partial<WizardData>;
  onClose: () => void;
  onSave: (data: WizardData) => Promise<void>;
}

export const PatientWizard: React.FC<PatientWizardProps> = ({ initialData, onClose, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState<WizardData>({
    name: '', dob: '', age: '', gender: 'Masculino', curp: '', maritalStatus: 'Soltero',
    phone: '', email: '', address: '', occupation: '', emergencyContact: '',
    allergies: '', nonCriticalAllergies: '', background: '', notes: '',
    // Defaults para compatibilidad
    pathological: {}, nonPathological: {}, family: {}, obgyn: {},
    insurance: '', rfc: '', invoice: false, patientType: 'Nuevo', referral: ''
  });

  // Carga de datos iniciales (Edición)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
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

  const handleChange = (field: keyof WizardData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error visual si existe
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
  };

  const validateAndSave = async () => {
    const newErrors: { [key: string]: boolean } = {};
    
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.gender) newErrors.gender = true;
    if (!formData.allergies.trim()) newErrors.allergies = true; // CRÍTICO

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Por favor complete los campos obligatorios marcados en rojo.");
      
      // Scroll al primer error
      const firstError = document.querySelector('.error-ring');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* --- HEADER EMR PROFESIONAL --- */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <User className="text-brand-teal" size={24} />
            Registro de Paciente
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide font-medium">
            Nuevo Ingreso Clínico
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* --- BODY SCROLLABLE (FORMULARIO CONTINUO) --- */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <section className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                <FileText className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Datos de Identificación</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Nombre Completo (Ancho total si se desea, o 2 columnas) */}
              <div className="col-span-1 md:col-span-2">
                <label className="label-emr">Nombre Completo <span className="text-red-500">*</span></label>
                <input 
                  className={`input-emr ${errors.name ? 'error-ring' : ''}`}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Apellido Paterno, Materno, Nombres"
                  autoFocus
                />
              </div>

              <div>
                <label className="label-emr">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  className="input-emr"
                  value={formData.dob}
                  onChange={(e) => handleChange('dob', e.target.value)}
                />
              </div>

              <div>
                <label className="label-emr">Edad</label>
                <input 
                  className="input-emr bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  value={formData.age}
                  readOnly
                  placeholder="Calculada automáticamente"
                />
              </div>

              <div>
                <label className="label-emr">Género <span className="text-red-500">*</span></label>
                <select 
                  className={`input-emr ${errors.gender ? 'error-ring' : ''}`}
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="No Binario">No Binario</option>
                </select>
              </div>

              <div>
                <label className="label-emr">Estado Civil</label>
                <select 
                  className="input-emr"
                  value={formData.maritalStatus}
                  onChange={(e) => handleChange('maritalStatus', e.target.value)}
                >
                  <option value="Soltero">Soltero/a</option>
                  <option value="Casado">Casado/a</option>
                  <option value="Divorciado">Divorciado/a</option>
                  <option value="Viudo">Viudo/a</option>
                  <option value="Unión Libre">Unión Libre</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                <MapPin className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Contacto y Ubicación</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="label-emr">Teléfono Móvil</label>
                <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                      className="input-emr pl-10"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="(000) 000-0000"
                      type="tel"
                    />
                </div>
              </div>

              <div>
                <label className="label-emr">Correo Electrónico</label>
                <input 
                  className="input-emr"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="ejemplo@correo.com"
                  type="email"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="label-emr">Dirección Completa</label>
                <input 
                  className="input-emr"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Calle, Número, Colonia, Ciudad, Código Postal"
                />
              </div>

              <div>
                <label className="label-emr">Ocupación</label>
                <input 
                  className="input-emr"
                  value={formData.occupation}
                  onChange={(e) => handleChange('occupation', e.target.value)}
                  placeholder="Profesión u Oficio"
                />
              </div>

              <div>
                <label className="label-emr">Contacto de Emergencia</label>
                <input 
                  className="input-emr"
                  value={formData.emergencyContact}
                  onChange={(e) => handleChange('emergencyContact', e.target.value)}
                  placeholder="Nombre y Teléfono (Parentesco)"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: DATOS CLÍNICOS CRÍTICOS */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                <ShieldAlert className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Datos Clínicos Críticos</h3>
            </div>

            <div className="space-y-6">
              {/* Alergias Críticas (Resaltado) */}
              <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16}/> Alergias Críticas (Obligatorio)
                </label>
                <textarea 
                  className={`input-emr border-red-200 focus:border-red-500 focus:ring-red-200 ${errors.allergies ? 'error-ring border-red-500 bg-white' : 'bg-white dark:bg-slate-900'}`}
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="Escriba 'NEGADAS' si no tiene alergias conocidas, o lístelas claramente."
                  rows={2}
                />
                {errors.allergies && (
                  <p className="text-xs text-red-600 mt-1 font-medium animate-pulse">Este campo es crítico para la seguridad del paciente.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="label-emr">Otras Alergias / Reacciones</label>
                    <input 
                      className="input-emr"
                      value={formData.nonCriticalAllergies}
                      onChange={(e) => handleChange('nonCriticalAllergies', e.target.value)}
                      placeholder="Ambientales, alimentos, etc."
                    />
                </div>
                <div>
                    <label className="label-emr">Antecedentes Médicos Relevantes</label>
                    <input 
                      className="input-emr"
                      value={formData.background}
                      onChange={(e) => handleChange('background', e.target.value)}
                      placeholder="Diabetes, Hipertensión, Cirugías previas..."
                    />
                </div>
              </div>

              <div>
                <label className="label-emr flex items-center gap-2">
                    <HeartPulse size={14} className="text-brand-teal"/> Notas Adicionales / Observaciones
                </label>
                <textarea 
                  className="input-emr min-h-[100px]"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Cualquier otro dato relevante para la primera consulta..."
                />
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-20 shadow-md">
        <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            Cancelar
        </button>

        <button 
            onClick={validateAndSave} 
            disabled={isSaving} 
            className="px-8 py-3 bg-brand-teal text-white rounded-lg font-bold flex items-center gap-2 hover:bg-teal-600 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100"
        >
            {isSaving ? <Activity className="animate-spin" size={20}/> : <Save size={20} />} 
            Guardar Paciente
        </button>
      </div>

      {/* ESTILOS INTERNOS PARA REUTILIZACIÓN */}
      <style>{`
        .label-emr { 
            @apply block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1; 
        }
        .input-emr { 
            @apply w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 transition-all placeholder:text-slate-400; 
        }
        .error-ring {
            @apply border-red-500 ring-2 ring-red-100 dark:ring-red-900/20 animate-shake;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
};