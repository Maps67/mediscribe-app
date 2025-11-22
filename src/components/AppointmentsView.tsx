import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, Search, User, X, Save, Trash2, ExternalLink, MapPin, CalendarCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment, Patient } from '../types';
import { MedicalDataService } from '../services/MedicalDataService';

const AppointmentsView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Formulario
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'new' | 'follow_up'>('follow_up');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [apptData, patData] = await Promise.all([
        MedicalDataService.getAppointments(),
        MedicalDataService.getPatients()
      ]);
      setAppointments(apptData);
      setPatients(patData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !date || !time) return;
    
    setIsSaving(true);
    try {
      // Combinar fecha y hora en formato ISO
      const dateTime = new Date(`${date}T${time}`).toISOString();
      
      await MedicalDataService.createAppointment({
        patient_id: selectedPatientId,
        date_time: dateTime,
        reason,
        type,
        status: 'scheduled'
      });

      setIsModalOpen(false);
      // Reset form
      setReason(''); setSelectedPatientId(''); 
      loadData(); // Recargar lista
    } catch (e) { alert("Error al agendar"); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Cancelar esta cita?")) return;
    try {
      await MedicalDataService.deleteAppointment(id);
      loadData();
    } catch (e) { alert("Error al eliminar"); }
  };

  // --- GENERADOR DE ENLACES A CALENDARIOS EXTERNOS ---
  const addToGoogleCalendar = (appt: Appointment) => {
    if (!appt.patients) return;
    
    const startDate = new Date(appt.date_time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Asumimos 1 hora de duración
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const title = encodeURIComponent(`Consulta: ${appt.patients.name}`);
    const details = encodeURIComponent(`Motivo: ${appt.reason || 'Consulta General'}\nTipo: ${appt.type === 'new' ? 'Primera vez' : 'Seguimiento'}`);
    const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agenda Médica</h2>
          <p className="text-slate-500 text-sm">Próximas citas programadas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Agendar Cita
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Cargando agenda...</div>
      ) : appointments.length === 0 ? (
        <div className="p-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-slate-500 font-medium">No hay citas próximas.</p>
          <p className="text-xs text-slate-400">Disfrute su tiempo libre o agende un paciente.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-md transition-shadow">
              
              {/* FECHA Y HORA */}
              <div className="flex items-center gap-4 min-w-[180px]">
                <div className="bg-slate-100 p-3 rounded-lg text-center min-w-[60px]">
                    <span className="block text-xs font-bold text-slate-500 uppercase">{new Date(appt.date_time).toLocaleDateString('es-MX', { month: 'short' })}</span>
                    <span className="block text-xl font-bold text-slate-800">{new Date(appt.date_time).getDate()}</span>
                </div>
                <div>
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                        <Clock size={16} className="text-brand-teal"/>
                        {new Date(appt.date_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${appt.type === 'new' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {appt.type === 'new' ? 'Primera Vez' : 'Seguimiento'}
                    </span>
                </div>
              </div>

              {/* DATOS PACIENTE */}
              <div className="flex-1 border-l border-slate-100 pl-4 md:pl-0 md:border-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-slate-400"/> 
                    {appt.patients?.name || "Paciente Desconocido"}
                </h3>
                <p className="text-sm text-slate-500 truncate">{appt.reason || "Sin motivo especificado"}</p>
              </div>

              {/* ACCIONES */}
              <div className="flex items-center gap-2">
                <button 
                    onClick={() => addToGoogleCalendar(appt)}
                    className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    title="Añadir a Google Calendar"
                >
                    <CalendarCheck size={16} className="text-blue-600"/> <span className="hidden md:inline">Google Cal</span>
                </button>
                <button 
                    onClick={() => handleDelete(appt.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 size={18} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL AGENDAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Nueva Cita</h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
                    <select 
                        required
                        className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-teal bg-white"
                        value={selectedPatientId}
                        onChange={e => setSelectedPatientId(e.target.value)}
                    >
                        <option value="">Seleccione un paciente...</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                        <input type="date" required className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-teal" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
                        <input type="time" required className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-teal" value={time} onChange={e => setTime(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Visita</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="type" checked={type === 'follow_up'} onChange={() => setType('follow_up')} className="text-brand-teal focus:ring-brand-teal"/>
                            <span className="text-sm text-slate-700">Seguimiento</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="type" checked={type === 'new'} onChange={() => setType('new')} className="text-brand-teal focus:ring-brand-teal"/>
                            <span className="text-sm text-slate-700">Primera Vez</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo (Opcional)</label>
                    <input type="text" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Ej. Revisión de análisis" value={reason} onChange={e => setReason(e.target.value)} />
                </div>

                <button type="submit" disabled={isSaving} className="w-full bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600 transition-colors shadow-lg flex justify-center items-center gap-2 mt-4">
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar Cita
                </button>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsView;