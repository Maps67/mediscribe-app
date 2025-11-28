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
  addHours,
  setHours,
  setMinutes,
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
  Calendar as CalIcon,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// --- TIPOS ---
type AppointmentType = 'consulta' | 'urgencia' | 'seguimiento';

interface Appointment {
  id: string;
  patient_id?: string; // Vinculación real
  patient_name?: string; // Fallback visual
  date_time: string; // start_time en DB
  type: AppointmentType;
  notes?: string;
  duration_minutes: number;
}

interface Patient {
  id: string;
  name: string;
}

// --- MODAL DE CITA CONECTADO ---
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
  const [formData, setFormData] = useState({
    patient_id: '',
    type: 'consulta',
    duration_minutes: 30,
    notes: ''
  });
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    if (isOpen) {
      if (existingAppt) {
        setFormData({
          patient_id: existingAppt.patient_id || '',
          type: existingAppt.type || 'consulta',
          duration_minutes: existingAppt.duration_minutes || 30,
          notes: existingAppt.notes || ''
        });
        setTime(format(parseISO(existingAppt.date_time), 'HH:mm'));
      } else {
        setFormData({ patient_id: '', type: 'consulta', duration_minutes: 30, notes: '' });
        setTime(format(new Date(), 'HH:mm'));
      }
    }
  }, [isOpen, existingAppt]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [hours, minutes] = time.split(':').map(Number);
    const dateWithTime = setMinutes(setHours(new Date(initialDate), hours), minutes);

    onSave({
      id: existingAppt?.id,
      patient_id: formData.patient_id,
      start_time: dateWithTime.toISOString(), // Supabase usa start_time
      title: formData.type === 'consulta' ? 'Consulta General' : formData.type === 'urgencia' ? 'Urgencia' : 'Seguimiento', // Título para dashboard
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
            <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
              {format(initialDate, "d 'de' MMMM", { locale: es })}
            </span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Paciente</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <select 
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all appearance-none"
                value={formData.patient_id}
                onChange={e => setFormData({...formData, patient_id: e.target.value})}
              >
                <option value="">Seleccione un paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {patients.length === 0 && <p className="text-[10px] text-red-400 mt-1">No hay pacientes registrados. Ve a la sección Pacientes primero.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="time" 
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
              <select 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="consulta">Consulta General</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="urgencia">Urgencia</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Notas (Opcional)</label>
             <textarea 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none text-sm"
                rows={2}
                placeholder="Motivo de consulta..."
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // 1. CARGA INICIAL DE DATOS (REALES)
  useEffect(() => {
    fetchData();
  }, [currentDate]); // Recargar si cambia el mes (opcional, por ahora carga todo)

  const fetchData = async () => {
    try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // A. Cargar Pacientes (Para el dropdown)
        const { data: patientsData } = await supabase
            .from('patients')
            .select('id, name')
            .eq('doctor_id', user.id); // Solo mis pacientes
        
        if (patientsData) setPatients(patientsData);

        // B. Cargar Citas (Del mes actual +/- para eficiencia)
        // Nota: Por simplicidad cargamos un rango amplio o todas las futuras
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
        toast.error("Error al cargar la agenda");
    } finally {
        setIsLoading(false);
    }
  };

  // --- HANDLERS ---
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

        const payload = {
            ...apptData,
            doctor_id: user.id, // VINCULACIÓN CRÍTICA
            user_id: user.id    // Compatibilidad
        };

        if (apptData.id) {
            // Update
            const { error } = await supabase.from('appointments').update(payload).eq('id', apptData.id);
            if (error) throw error;
            toast.success("Cita actualizada");
        } else {
            // Insert
            const { error } = await supabase.from('appointments').insert([payload]);
            if (error) throw error;
            toast.success("Cita creada");
        }
        
        await fetchData(); // Recargar datos frescos
        setIsModalOpen(false);

    } catch (error: any) {
        console.error(error);
        toast.error("Error al guardar: " + error.message);
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

  // --- LÓGICA DE CALENDARIO ---
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
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Agenda Médica
          </h1>
          <p className="text-slate-500 text-sm">Organiza tu práctica y sincroniza con el exterior.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => { setSelectedDate(new Date()); setEditingAppt(null); setIsModalOpen(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-teal-200/50 transition-all active:scale-95"
          >
            <Plus size={18} />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* CONTROLES */}
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
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all text-center ${
                (view === 'month' && v === 'Mes') 
                  ? 'bg-white text-teal-700 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* CALENDARIO GRID */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-sm flex-1 overflow-hidden flex flex-col min-h-[500px]">
        {/* DÍAS HEADER */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 backdrop-blur">
          {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* DÍAS BODY */}
        <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-slate-50/20">
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100/50" />
          ))}

          {daysInMonth.map((day) => {
            const isTodayDate = isToday(day);
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={`
                  relative min-h-[100px] p-2 border-b border-r border-slate-100 transition-all hover:bg-white hover:shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] group cursor-pointer
                  ${isTodayDate ? 'bg-teal-50/30' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span 
                    className={`
                      text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all
                      ${isTodayDate 
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-200' 
                        : 'text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 text-teal-500 hover:text-teal-700 hover:bg-teal-50 p-1 rounded-full transition-all transform hover:scale-110">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {renderAppointmentsForDay(day)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL INYECTADO --- */}
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