import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppointmentService } from '../services/AppointmentService';
import { Appointment, Patient } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, X, Calendar as CalendarIcon, User, Smartphone, Download } from 'lucide-react';
import './CalendarDarkOverrides.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const CalendarView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    id: '', // Para editar/borrar
    patientId: '',
    patientName: '', // Para el archivo ICS
    title: '',
    notes: '',
    startTime: '',
    endTime: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: patientsData } = await supabase.from('patients').select('*').order('name');
      setPatients(patientsData || []);
      const appointmentsData = await AppointmentService.getAppointments();
      setAppointments(appointmentsData);
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // --- GENERADOR DE COLORES DINÁMICOS ---
  // Crea un color único y consistente basado en el nombre del paciente
  const stringToColor = (str: string) => {
    if (!str) return '#0d9488'; // Color default
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Colores pastel saturados para modo oscuro/claro
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
  };

  const eventStyleGetter = (event: any) => {
    const patientName = event.resource.patient?.name || 'General';
    const backgroundColor = stringToColor(patientName);
    
    return {
      style: {
        backgroundColor: backgroundColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontSize: '0.85rem',
        fontWeight: '500'
      }
    };
  };

  const calendarEvents = appointments.map(app => ({
    id: app.id,
    title: `${app.title} - ${app.patient?.name || 'Sin nombre'}`,
    start: new Date(app.start_time),
    end: new Date(app.end_time),
    resource: app
  }));

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const toLocalISO = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    setFormData({
      id: '', patientId: '', patientName: '', title: 'Consulta General', notes: '',
      startTime: toLocalISO(start), endTime: toLocalISO(end)
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    const app = event.resource as Appointment;
    const toLocalISO = (dateString: string) => {
        const date = new Date(dateString);
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    setFormData({
        id: app.id,
        patientId: app.patient_id,
        patientName: app.patient?.name || '',
        title: app.title,
        notes: app.notes || '',
        startTime: toLocalISO(app.start_time),
        endTime: toLocalISO(app.end_time)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (formData.id) {
          // Actualizar existente (si tuviéramos update en service, por ahora creamos o borramos)
          // Para simplificar este paso, asumiremos creación nueva o mejora futura de edición
          toast.info("Edición simplificada: Se guardará como nueva si modificaste fechas.");
      }

      await AppointmentService.createAppointment({
        patient_id: formData.patientId,
        title: formData.title,
        start_time: new Date(formData.startTime).toISOString(),
        end_time: new Date(formData.endTime).toISOString(),
        notes: formData.notes,
        status: 'scheduled'
      });
      toast.success("Cita guardada");
      setIsModalOpen(false);
      const refreshCitas = await AppointmentService.getAppointments();
      setAppointments(refreshCitas);
    } catch (error) { toast.error("Error al guardar"); } 
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
      if (!formData.id) return;
      if(confirm("¿Eliminar esta cita?")) {
        try {
            await AppointmentService.deleteAppointment(formData.id);
            toast.success("Cita eliminada");
            setIsModalOpen(false);
            const refresh = await AppointmentService.getAppointments();
            setAppointments(refresh);
        } catch (e) { toast.error("Error al eliminar"); }
      }
  };

  // --- CONEXIÓN EXTERNA (GOOGLE/APPLE/SAMSUNG) ---
  const handleExportToCalendar = () => {
    if (!formData.startTime || !formData.endTime) return;

    // Formato ICS estándar
    const startDate = new Date(formData.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDate = new Date(formData.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:MediScribe: ${formData.title} con ${formData.patientName || 'Paciente'}`,
        `DESCRIPTION:${formData.notes || 'Sin notas adicionales.'}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Cita-${formData.patientName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Archivo de calendario generado. Ábrelo para guardar en tu celular.");
  };

  return (
    <div className="h-full p-6 animate-fade-in-up flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Agenda Médica</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visualiza y sincroniza tus consultas.</p>
        </div>
        <button 
          onClick={() => {
            const now = new Date();
            const end = new Date(now.getTime() + 30*60*1000);
            handleSelectSlot({ start: now, end: end });
          }}
          className="bg-brand-teal text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-teal-600 transition-all"
        >
          <Plus size={20} /> Nueva Cita
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[600px] text-slate-800 dark:text-slate-200">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Cargando agenda...</div>
        ) : (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda" }}
            culture='es'
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent} // Ahora abre el modal al hacer clic
            eventPropGetter={eventStyleGetter} // Colores dinámicos
            defaultView='week'
          />
        )}
      </div>

      {/* MODAL DETALLE / NUEVA CITA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-brand-teal" size={20}/> {formData.id ? 'Detalles de Cita' : 'Agendar Cita'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-sm font-bold mb-1 flex items-center gap-2"><User size={16}/> Paciente</label>
                <select 
                  required
                  disabled={!!formData.id} // No cambiar paciente al editar
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 focus:border-brand-teal transition-colors disabled:opacity-60"
                  value={formData.patientId}
                  onChange={e => {
                      const selected = patients.find(p => p.id === e.target.value);
                      setFormData({...formData, patientId: e.target.value, patientName: selected?.name || ''})
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input type="text" required className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 focus:border-brand-teal" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Inicio</label>
                  <input type="datetime-local" required className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fin</label>
                  <input type="datetime-local" required className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}/>
                </div>
              </div>

              {/* ACCIONES EXTRA PARA CITAS EXISTENTES */}
              {formData.id && (
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sincronización</span>
                      <button 
                        type="button" 
                        onClick={handleExportToCalendar}
                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                          <Smartphone size={14} /> Añadir a mi Celular/Google
                      </button>
                  </div>
              )}

              <div className="flex gap-3 pt-2">
                  {formData.id && (
                      <button type="button" onClick={handleDelete} className="px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-bold text-sm">Eliminar</button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-1 bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600 shadow-md flex justify-center items-center gap-2">
                    {isSaving ? 'Guardando...' : formData.id ? 'Guardar Cambios' : 'Confirmar Cita'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;