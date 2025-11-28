import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay,
  isToday,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  User, 
  Trash2,
  Loader2,
  UserPlus,
  List,
  Calendar as CalendarIcon // Icono para la fecha
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// --- TIPOS ---
type AppointmentType = 'consulta' | 'urgencia' | 'seguimiento';

interface Appointment {
  id: string;
  patient_id?: string;
  patient_name?: string; 
  date_time: string; 
  type: AppointmentType;
  notes?: string;
  duration_minutes: number;
}

interface Patient {
  id: string;
  name: string;
}

// --- MODAL DE CITA (AHORA CON SELECTOR DE FECHA) ---
const AppointmentModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialDate, 
  existingAppt,
  patients,
  loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (appt: any) => void;
  onDelete?: (id: string) => void;
  initialDate: Date;
  existingAppt?: Appointment | null;
  patients: Patient[];
  loading: boolean;
}) => {
  const [isManual, setIsManual] = useState(false);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    manual_name: '',
    type: 'consulta',
    duration_minutes: 30,
    notes: ''
  });
  
  // Estados separados para Fecha y Hora
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('09:00');

  useEffect(() => {
    if (isOpen) {
      if (existingAppt) {
        const isApptManual = !existingAppt.patient_id;
        setIsManual(isApptManual);
        
        setFormData({
          patient_id: existingAppt.patient_id || '',
          manual_name: isApptManual ? (existingAppt.patient_name || '') : '',
          type: existingAppt.type || 'consulta',
          duration_minutes: existingAppt.duration_minutes || 30,
          notes: existingAppt.notes || ''
        });
        
        // Extraer fecha y hora de la cita existente
        const dt = parseISO(existingAppt.date_time);
        setDateStr(format(dt, 'yyyy-MM-dd'));
        setTimeStr(format(dt, 'HH:mm'));
        
      } else {
        setIsManual(false);
        setFormData({ patient_id: '', manual_name: '', type: 'consulta', duration_minutes: 30, notes: '' });
        
        // Usar la fecha seleccionada en el calendario (o hoy)
        setDateStr(format(initialDate, 'yyyy-MM-dd'));
        setTimeStr(format(new Date(), 'HH:mm'));
      }
    }
  }, [isOpen, existingAppt, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combinar Fecha y Hora seleccionadas manualmente
    // Crear la fecha en local para evitar desfases de zona horaria simples
    const dateTimeString = `${dateStr}T${timeStr}:00`;
    const finalDate = new Date(dateTimeString); // Objeto Date nativo

    let titleToSave = '';
    if (isManual) {
        titleToSave = formData.manual_name;
    } else {
        const selectedPatient = patients.find(p => p.id === formData.patient_id);
        titleToSave = selectedPatient ? selectedPatient.name : (formData.type === 'consulta' ? 'Consulta General' : 'Cita');
    }

    onSave({
      id: existingAppt?.id,
      patient_id: isManual ? null : formData.patient_id,
      start_time: finalDate.toISOString(), // Convertir a ISO para Supabase
      title: titleToSave,
      status: 'scheduled',
      type: formData.type,
      duration_minutes: formData.duration_minutes,
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            {existingAppt ? 'Editar Cita' : 'Nueva Cita'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* SELECCIÓN DE PACIENTE */}
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Paciente</label>
                <button 
                    type="button"
                    onClick={() => { setIsManual(!isManual); setFormData({...formData, patient_id: '', manual_name: ''}); }}
                    className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded transition-colors"
                >
                    {isManual ? <><List size={12}/> Seleccionar de Lista</> : <><UserPlus size={12}/> Ingresar Manualmente</>}
                </button>
            </div>
            
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              {isManual ? (
                  <input 
                    type="text"
                    required
                    autoFocus
                    placeholder="Escribe el nombre del paciente..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    value={formData.manual_name}
                    onChange={e => setFormData({...formData, manual_name: e.target.value})}
                  />
              ) : (
                  <select 
                    required
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all appearance-none"
                    value={formData.patient_id}
                    onChange={e => setFormData({...formData, patient_id: e.target.value})}
                  >
                    <option value="">Seleccione un paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
              )}
            </div>
          </div>

          {/* FECHA Y HORA (LIBERTAD TOTAL) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Fecha</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="date" 
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="time" 
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  value={timeStr}
                  onChange={e => setTimeStr(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* TIPO Y DURACIÓN */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
                <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                >
                    <option value="consulta">Consulta</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="urgencia">Urgencia</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Duración (Min)</label>
                <input 
                    type="number"
                    min="5"
                    step="5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                />
             </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Notas</label>
             <textarea 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none text-sm"
                rows={2}
                placeholder="Motivo..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
             />
          </div>

          <div className="pt-2 flex gap-3">
             {existingAppt && onDelete && (
                <button 
                  type="button"
                  onClick={() => onDelete(existingAppt.id)}
                  className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  title="Eliminar Cita"
                >
                  <Trash2 size={20} />
                </button>
             )}

             <button 
               type="submit" 
               disabled={loading}
               className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg shadow-md shadow-teal-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" size={18}/> : (existingAppt ? 'Guardar Cambios' : 'Agendar Cita')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- VISTA PRINCIPAL ---
const AgendaView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]); 

  const fetchData = async () => {
    try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Cargar Pacientes
        const { data: patientsData } = await supabase
            .from('patients')
            .select('id, name')
            .eq('doctor_id', user.id);
        
        if (patientsData) setPatients(patientsData);

        // Cargar Citas
        const start = startOfMonth(subMonths(currentDate, 1)).toISOString();
        const end = endOfMonth(addMonths(currentDate, 2)).toISOString();

        const { data: apptsData } = await supabase
            .from('appointments')
            .select(`
                id, start_time, duration_minutes, notes, status, title,
                patient:patients (name, id)
            `)
            .eq('doctor_id', user.id)
            .gte('start_time', start)
            .lte('start_time', end);

        if (apptsData) {
            const mappedAppts: Appointment[] = apptsData.map((a: any) => ({
                id: a.id,
                patient_id: a.patient?.id,
                patient_name: a.patient?.name || a.title || 'Sin Nombre',
                date_time: a.start_time,
                type: (a.title?.toLowerCase().includes('urgencia') ? 'urgencia' : 'consulta') as AppointmentType,
                notes: a.notes,
                duration_minutes: a.duration_minutes
            }));
            setAppointments(mappedAppts);
        }

    } catch (e) {
        console.error("Error fetching agenda:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingAppt(null); 
    setIsModalOpen(true);
  };

  const handleApptClick = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation(); 
    setSelectedDate(parseISO(appt.date_time));
    setEditingAppt(appt); 
    setIsModalOpen(true);
  };

  const saveAppointment = async (apptData: any) => {
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        const payload: any = {
            doctor_id: user.id,
            start_time: apptData.start_time,
            title: apptData.title,
            status: apptData.status,
            notes: apptData.notes,
            duration_minutes: apptData.duration_minutes
        };

        if (apptData.patient_id) {
            payload.patient_id = apptData.patient_id;
        } else {
            payload.patient_id = null; // IMPORTANTE: Explicito null para manuales
        }

        if (apptData.id) {
            const { error } = await supabase.from('appointments').update(payload).eq('id', apptData.id);
            if (error) throw error;
            toast.success("Cita actualizada");
        } else {
            const { error } = await supabase.from('appointments').insert([payload]);
            if (error) throw error;
            toast.success("Cita agendada");
        }
        
        await fetchData(); 
        setIsModalOpen(false);

    } catch (error: any) {
        console.error(error);
        toast.error("Error: " + (error.message || "No se pudo guardar"));
    } finally {
        setIsSaving(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    if(!confirm('¿Estás seguro de cancelar esta cita?')) return;
    
    try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;
        toast.success("Cita eliminada");
        setAppointments(prev => prev.filter(a => a.id !== id));
        setIsModalOpen(false);
    } catch (error) {
        toast.error("Error al eliminar");
    }
  };

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1; 

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderAppointmentsForDay = (day: Date) => {
    const dayApps = appointments.filter(app => isSameDay(parseISO(app.date_time), day));
    
    return dayApps.map(app => (
      <div 
        key={app.id} 
        onClick={(e) => handleApptClick(e, app)}
        className={`
          group mt-1 px-2 py-1.5 text-[11px] rounded border-l-2 truncate cursor-pointer transition-all shadow-sm hover:shadow-md
          ${app.type === 'urgencia' 
            ? 'bg-red-50 text-red-800 border-red-500 hover:bg-red-100' 
            : 'bg-teal-50 text-teal-800 border-teal-500 hover:bg-teal-100'}
        `}
      >
        <div className="flex items-center gap-1">
          <span className="font-bold opacity-75">{format(parseISO(app.date_time), 'HH:mm')}</span> 
          <span className="truncate">{app.patient_name}</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-4 md:p-6 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Agenda Médica</h1>
          <p className="text-slate-500 text-sm">Organiza tu práctica y sincroniza con el exterior.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setSelectedDate(new Date()); setEditingAppt(null); setIsModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-teal-200/50 transition-all active:scale-95">
            <Plus size={18} /> Nueva Cita
          </button>
        </div>
      </div>

      <div className="bg-white rounded-t-2xl border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600 shadow-sm hover:shadow"><ChevronLeft size={20} /></button>
            <button onClick={goToToday} className="px-4 py-1.5 text-sm font-semibold text-slate-700 hover:text-teal-600 transition-colors">Hoy</button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600 shadow-sm hover:shadow"><ChevronRight size={20} /></button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 capitalize min-w-[140px] text-center sm:text-left">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 text-sm w-full sm:w-auto">
          {['Mes', 'Semana', 'Día'].map((v) => (
            <button key={v} onClick={() => setView(v as any)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all text-center ${(view === 'month' && v === 'Mes') ? 'bg-white text-teal-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-sm flex-1 overflow-hidden flex flex-col min-h-[500px]">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 backdrop-blur">
          {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-slate-50/20">
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100/50" />
          ))}
          {daysInMonth.map((day) => {
            const isTodayDate = isToday(day);
            return (
              <div key={day.toString()} onClick={() => handleDayClick(day)} className={`relative min-h-[100px] p-2 border-b border-r border-slate-100 transition-all hover:bg-white hover:shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] group cursor-pointer ${isTodayDate ? 'bg-teal-50/30' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all ${isTodayDate ? 'bg-teal-600 text-white shadow-md shadow-teal-200' : 'text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 text-teal-500 hover:text-teal-700 hover:bg-teal-50 p-1 rounded-full transition-all transform hover:scale-110"><Plus size={16} /></button>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {renderAppointmentsForDay(day)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDate={selectedDate}
        existingAppt={editingAppt}
        onSave={saveAppointment}
        onDelete={deleteAppointment}
        patients={patients}
        loading={isSaving}
      />
    </div>
  );
};

export default AgendaView;