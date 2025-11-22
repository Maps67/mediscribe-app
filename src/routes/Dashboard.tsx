import React, { useEffect, useState } from 'react';
import { Users, Activity, ShieldCheck, Sparkles, Clock, ChevronRight, Sun, Moon, Sunrise, MessageCircle, HelpCircle, ExternalLink, Calendar, ClipboardCheck, X, FileText, MapPin, Bell, BellOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAppointmentAlarms } from '../hooks/useAppointmentAlarms';

const TIPS_AND_QUOTES = [
  "La medicina es la más humana de las artes. - Edmund Pellegrino",
  "Tip: Usa el micrófono en ambientes con poco ruido.",
  "Tip: Puedes editar cualquier nota antes de guardarla.",
  "El buen médico trata la enfermedad; el gran médico trata al paciente. - William Osler",
  "Tip: Recuerda actualizar tu firma digital en Configuración.",
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // --- ALARMAS INTELIGENTES CON CONTROLES ---
  const { isSilent, toggleSound } = useAppointmentAlarms(); 
  // ------------------------------------------

  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  
  const [stats, setStats] = useState({ 
      totalPatients: 0, 
      appointmentsToday: 0, 
      consultationsDoneCount: 0, 
      nextAppt: '---' 
  });

  const [todaysConsultationsList, setTodaysConsultationsList] = useState<any[]>([]);
  const [todaysAppointmentsList, setTodaysAppointmentsList] = useState<any[]>([]);
  const [isConsultationsModalOpen, setIsConsultationsModalOpen] = useState(false);
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    determineGreeting();
    setQuote(TIPS_AND_QUOTES[Math.floor(Math.random() * TIPS_AND_QUOTES.length)]);
  }, []);

  const determineGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  };

  const handleSupport = () => {
    const YOUR_WHATSAPP = "523330583807"; 
    const message = "Hola Pixel Art, soy usuario de MediScribe y necesito ayuda.";
    window.open(`https://wa.me/${YOUR_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setDoctorName(profile?.full_name || 'Doctor');

      const { count: patientsCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });

      const today = new Date(); 
      today.setHours(0, 0, 0, 0); 
      const tomorrow = new Date(today); 
      tomorrow.setDate(tomorrow.getDate() + 1);
      const now = new Date();

      const { data: appointmentsTodayData } = await supabase
        .from('appointments')
        .select('*')
        .gte('date_time', today.toISOString())
        .lt('date_time', tomorrow.toISOString())
        .order('date_time', { ascending: true });

      const appointmentsList = appointmentsTodayData || [];
      setTodaysAppointmentsList(appointmentsList);

      const pendingAppointmentsCount = appointmentsList.filter(appt => new Date(appt.date_time) >= now).length;

      const { data: consultationsTodayData, count: consultationsDoneCount } = await supabase
        .from('consultations')
        .select('*, patients(name)', { count: 'exact' })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at', { ascending: false }); 

      setTodaysConsultationsList(consultationsTodayData || []);

      const { data: nextApptData } = await supabase
        .from('appointments')
        .select('date_time')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
        .single();
      
      let nextApptString = 'Sin pendientes';
      if (nextApptData) {
          const date = new Date(nextApptData.date_time);
          nextApptString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (date.getDate() !== new Date().getDate()) {
            nextApptString = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + nextApptString;
          }
      }

      setStats({ 
        totalPatients: patientsCount || 0, 
        appointmentsToday: pendingAppointmentsCount,
        consultationsDoneCount: consultationsDoneCount || 0,
        nextAppt: nextApptString 
      });

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading) return <div className="p-6 max-w-6xl mx-auto animate-pulse"><div className="h-40 bg-slate-100 rounded-xl mb-8"></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-slate-50 rounded-xl"></div>)}</div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      
      {/* HERO SECTION CON CONTROL DE ALARMA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-teal"></div>
          
          <div className="flex-1 z-10 text-center md:text-left mb-4 md:mb-0">
             <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                 <h2 className="text-2xl font-bold text-slate-800">{greeting}, <span className="text-brand-teal">{doctorName.split(' ')[0]}</span></h2>
                 {/* BOTÓN DE CONFIGURACIÓN DE ALARMA */}
                 <button 
                    onClick={toggleSound}
                    className={`p-1.5 rounded-full transition-all border ${isSilent ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
                    title={isSilent ? "Modo Silencio Activado (Solo visual)" : "Sonido Activado"}
                 >
                    {isSilent ? <BellOff size={16} /> : <Bell size={16} />}
                 </button>
             </div>
             <p className="text-slate-400 text-sm italic">"{quote}"</p>
          </div>
          
          <div className="z-10">
             <button onClick={() => navigate('/consultation')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 hover:scale-105 transition-transform active:scale-95">
                <Activity size={18} /> Iniciar Consulta
             </button>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-gradient-to-br from-brand-teal/5 to-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>
      
      {/* GRID INTELIGENTE DE ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
         
         <div onClick={() => navigate('/patients')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer transition-all group">
            <div className="flex justify-between mb-2"><div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Users size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-blue-500" size={16}/></div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPatients}</p><p className="text-slate-400 text-xs font-bold uppercase">Pacientes</p>
         </div>

         <div onClick={() => setIsAppointmentsModalOpen(true)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-300 cursor-pointer transition-all group">
            <div className="flex justify-between mb-2"><div className="bg-teal-50 p-2 rounded-lg text-brand-teal"><Calendar size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-brand-teal" size={16}/></div>
            <p className="text-2xl font-bold text-slate-800">{stats.appointmentsToday}</p><p className="text-slate-400 text-xs font-bold uppercase">Citas Pendientes</p>
         </div>

         <div onClick={() => setIsConsultationsModalOpen(true)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-1">
                <span className={`flex h-2 w-2 rounded-full ${stats.consultationsDoneCount > 0 ? 'bg-indigo-500' : 'bg-slate-200'}`}></span>
             </div>
            <div className="flex justify-between mb-2"><div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><ClipboardCheck size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-indigo-500" size={16}/></div>
            <p className="text-2xl font-bold text-slate-800">{stats.consultationsDoneCount}</p><p className="text-slate-400 text-xs font-bold uppercase">Realizadas</p>
         </div>

         <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-300 cursor-pointer transition-all group">
             <div className="flex justify-between mb-2"><div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Clock size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-purple-500" size={16}/></div>
            <p className="text-xl font-bold text-slate-800 truncate">{stats.nextAppt}</p><p className="text-slate-400 text-xs font-bold uppercase">Siguiente</p>
         </div>

         <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between mb-2"><div className="bg-orange-50 p-2 rounded-lg text-orange-600"><ShieldCheck size={18}/></div><div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div></div>
            <p className="text-xl font-bold text-slate-800">Seguro</p><p className="text-slate-400 text-xs font-bold uppercase">Estado</p>
         </div>

      </div>
      
      {/* FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-5 relative overflow-hidden cursor-pointer group" onClick={() => navigate('/card')}>
             <div className="relative z-10 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Users size={18} className="text-teal-400"/> Tu Tarjeta Digital</h3>
                    <p className="text-slate-400 text-xs">Comparte tu perfil profesional con un código QR.</p>
                </div>
                <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors"><ChevronRight/></div>
             </div>
             <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl"></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-center relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><HelpCircle size={16} className="text-blue-500"/> Soporte Técnico</h3>
                <button onClick={handleSupport} className="w-full bg-blue-50 text-blue-600 text-xs font-bold py-2.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                    <MessageCircle size={14} /> Contactar a Pixel Art
                </button>
             </div>
        </div>
      </div>

      {/* MODAL 1: AGENDA DE HOY */}
      {isAppointmentsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                     <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Calendar className="text-teal-600" size={20}/> Agenda de Hoy
                        </h3>
                        <p className="text-xs text-slate-500">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     </div>
                     <button onClick={() => setIsAppointmentsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 p-0 overflow-y-auto bg-slate-50/50">
                    {todaysAppointmentsList.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {todaysAppointmentsList.map((appt) => {
                                const isPast = new Date(appt.date_time) < new Date();
                                return (
                                    <div key={appt.id} className={`p-4 transition-colors ${isPast ? 'bg-slate-50 opacity-60' : 'bg-white hover:bg-teal-50/50'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`font-mono text-sm font-bold px-2 py-1 rounded ${isPast ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-700'}`}>
                                                    {new Date(appt.date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{appt.patient_name}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{appt.reason}</p>
                                                </div>
                                            </div>
                                            {isPast && <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">PASADA</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                                <button onClick={() => navigate('/appointments')} className="text-teal-600 text-xs font-bold hover:underline flex items-center gap-1">
                                    <ExternalLink size={12}/> Gestionar Agenda Completa
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <Calendar size={40} className="mb-2 opacity-20"/>
                            <p className="text-sm">Agenda libre por hoy.</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}

      {/* MODAL 2: CONSULTAS REALIZADAS */}
      {isConsultationsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                     <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <ClipboardCheck className="text-indigo-600" size={20}/> Consultas Realizadas
                        </h3>
                        <p className="text-xs text-slate-500">Historial del día</p>
                     </div>
                     <button onClick={() => setIsConsultationsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm transition-colors"><X size={20} /></button>
                </div>
                
                <div className="flex-1 p-0 overflow-y-auto bg-slate-50/50">
                    {todaysConsultationsList.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {todaysConsultationsList.map((consult) => (
                                <div key={consult.id} className="p-4 bg-white hover:bg-indigo-50/50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-800">{consult.patients?.name || 'Paciente sin nombre'}</span>
                                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                            {new Date(consult.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{consult.summary}</p>
                                    <div className="flex justify-end">
                                         <button 
                                            onClick={() => {
                                                setIsConsultationsModalOpen(false);
                                                navigate('/patients', { state: { openPatientId: consult.patient_id } });
                                            }}
                                            className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                         >
                                            <FileText size={12}/> Ver en Expediente
                                         </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <ClipboardCheck size={40} className="mb-2 opacity-20"/>
                            <p className="text-sm">No has realizado consultas hoy.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;