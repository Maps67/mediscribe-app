import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Bell, CloudRain, Cloud, 
  ShieldCheck, Upload, X, Clock, UserCircle, Stethoscope,
  Bot, Mic, Square, Loader2, CheckCircle2, AlertCircle // Iconos nuevos
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';
import { toast } from 'sonner';

// --- NUEVAS IMPORTACIONES ---
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AssistantService, AssistantResponse } from '../services/AssistantService';
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

// Interfaz local para el Dashboard
interface DashboardAppointment {
  id: string;
  title: string;
  start_time: string;
  status: string;
  patient?: {
    name: string;
  };
}

// --- COMPONENTE RELOJ ---
const LiveClock = ({ mobile = false }: { mobile?: boolean }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={`flex flex-col ${mobile ? 'items-start mt-3 border-t border-white/20 pt-2 w-full' : 'items-center justify-center'}`}>
      <div className={`${mobile ? 'text-3xl' : 'text-6xl'} font-bold tracking-widest tabular-nums leading-none flex items-baseline`}>
        {format(time, 'h:mm')}
        <span className={`${mobile ? 'text-sm' : 'text-2xl'} ml-1 font-medium opacity-60`}>{format(time, 'a')}</span>
      </div>
      <div className={`${mobile ? 'text-[10px]' : 'text-sm'} font-medium opacity-80 uppercase tracking-widest mt-1`}>
        {format(time, "EEEE d 'de' MMMM", { locale: es })}
      </div>
    </div>
  );
};

// --- NUEVO: MODAL DEL ASISTENTE DE VOZ ---
const AssistantModal = ({ isOpen, onClose, onActionComplete }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'confirming'>('idle');
  const [aiResponse, setAiResponse] = useState<AssistantResponse | null>(null);

  // Reiniciar estado al abrir
  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      setStatus('idle');
      setAiResponse(null);
    } else {
      stopListening();
    }
  }, [isOpen]);

  const handleToggleRecord = () => {
    if (isListening) {
      stopListening();
      handleProcess();
    } else {
      startListening();
      setStatus('listening');
    }
  };

  const handleProcess = async () => {
    if (!transcript) return;
    setStatus('processing');
    try {
      const response = await AssistantService.processCommand(transcript);
      setAiResponse(response);
      setStatus('confirming');
    } catch (error) {
      toast.error("Error al procesar comando");
      setStatus('idle');
    }
  };

  const handleExecute = async () => {
    if (!aiResponse || !aiResponse.data) return;
    
    // EJECUCIÓN DE ACCIÓN: CREAR CITA
    if (aiResponse.action === 'create_appointment') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        const { error } = await supabase.from('appointments').insert({
          doctor_id: user.id,
          title: aiResponse.data.patientName || "Cita Agendada", // Nombre del paciente como título
          start_time: aiResponse.data.start_time,
          duration_minutes: aiResponse.data.duration_minutes || 30,
          status: 'scheduled',
          notes: aiResponse.data.notes || "Agendado por Asistente de Voz",
          patient_id: null // Cita manual/rápida
        });

        if (error) throw error;
        toast.success("✅ Cita agendada correctamente");
        onActionComplete(); // Recargar dashboard
        onClose();
      } catch (e: any) {
        toast.error("Error al guardar: " + e.message);
      }
    } else {
      toast.info("No entendí la acción, intenta de nuevo.");
      setStatus('idle');
      resetTranscript();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header con Gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white text-center relative overflow-hidden">
          <Bot size={48} className="mx-auto mb-2 relative z-10" />
          <h3 className="text-xl font-bold relative z-10">Asistente MediScribe</h3>
          <p className="text-indigo-100 text-sm relative z-10">¿Qué necesitas agendar hoy?</p>
          
          {/* Ondas decorativas */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
             <div className="absolute w-32 h-32 bg-white rounded-full -top-10 -left-10 blur-2xl"></div>
             <div className="absolute w-32 h-32 bg-white rounded-full -bottom-10 -right-10 blur-2xl"></div>
          </div>
        </div>

        <div className="p-6">
          
          {/* Estado: Escuchando / Procesando */}
          {status !== 'confirming' && (
            <div className="flex flex-col items-center gap-6">
               <div className={`text-center text-lg font-medium ${transcript ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                 "{transcript || 'Presiona el micrófono y habla...'}"
               </div>
               
               {status === 'processing' ? (
                 <div className="flex items-center gap-2 text-indigo-600 font-bold animate-pulse">
                   <Loader2 className="animate-spin" /> Procesando inteligencia...
                 </div>
               ) : (
                 <button 
                  onClick={handleToggleRecord}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                 >
                   {isListening ? <Square size={32} fill="currentColor"/> : <Mic size={32} />}
                 </button>
               )}
               
               <p className="text-xs text-slate-400 text-center max-w-xs">
                 Prueba: "Agendar cita para María López mañana a las 5 de la tarde"
               </p>
            </div>
          )}

          {/* Estado: Confirmación */}
          {status === 'confirming' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20}/>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Acción Detectada</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{aiResponse.message}</p>
                  </div>
                </div>
                
                {aiResponse.data && (
                  <div className="mt-4 bg-white dark:bg-slate-800 p-3 rounded-lg text-sm border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-slate-500">Paciente:</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">{aiResponse.data.patientName}</span>
                      
                      <span className="text-slate-500">Fecha:</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {aiResponse.data.start_time ? format(parseISO(aiResponse.data.start_time), "d MMM, h:mm a", {locale: es}) : '--'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); }} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={handleExecute} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                  Confirmar <ChevronRight size={18}/>
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer Cerrar */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center">
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider">Cerrar Asistente</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DASHBOARD PRINCIPAL ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  
  // Modales
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false); // Estado para el Asistente
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // 1. CLIMA
  useEffect(() => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
                const data = await res.json();
                setWeather({ 
                    temp: Math.round(data.current.temperature_2m).toString(), 
                    code: data.current.weather_code 
                });
            } catch (e) { console.log("Error clima", e); }
        });
    }
  }, []);

  const getWeatherIcon = () => {
      const animClass = "animate-pulse duration-[3000ms]"; 
      if (weather.code >= 51 && weather.code <= 67) return <CloudRain size={56} className={`text-blue-200 opacity-90 ${animClass}`}/>;
      if (weather.code >= 1 && weather.code <= 3) return <Cloud size={56} className={`text-slate-200 opacity-90 ${animClass}`}/>;
      return isNight 
        ? <Moon size={56} className={`text-indigo-200 opacity-90 ${animClass}`}/> 
        : <Sun size={56} className={`text-yellow-300 opacity-90 ${animClass}`}/>;
  };

  const heroStyle = isNight 
    ? { bg: "bg-gradient-to-br from-slate-900 to-indigo-950", text: "text-indigo-100" }
    : { bg: "bg-gradient-to-br from-teal-500 to-teal-700", text: "text-teal-50" };

  // 2. CARGA DE DATOS (REUTILIZABLE PARA RECARGAR AL AGENDAR)
  const fetchData = async () => {
      try {
          // setLoading(true); // Opcional: no bloquear la UI al recargar en segundo plano
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
              const rawName = profile?.full_name?.split(' ')[0] || 'Colega';
              setDoctorName(`Dr. ${rawName}`);

              const todayStart = startOfDay(new Date()); 
              const nextWeekEnd = endOfDay(addDays(new Date(), 7));

              let query = supabase
                  .from('appointments')
                  .select(`id, title, start_time, status, patient:patients (name)`)
                  .eq('doctor_id', user.id)
                  .gte('start_time', todayStart.toISOString())
                  .lte('start_time', nextWeekEnd.toISOString())
                  .order('start_time', { ascending: true })
                  .limit(10);

              let { data: aptsData, error } = await query;

              if (error || !aptsData) {
                  const fallbackQuery = supabase
                      .from('appointments')
                      .select(`id, title, start_time, status, patient:patients (name)`)
                      .eq('user_id', user.id)
                      .gte('start_time', todayStart.toISOString())
                      .lte('start_time', nextWeekEnd.toISOString())
                      .order('start_time', { ascending: true })
                      .limit(10);
                  const res = await fallbackQuery;
                  if (!res.error) aptsData = res.data;
              }

              if (aptsData) {
                  const formattedApts: DashboardAppointment[] = aptsData.map((item: any) => ({
                      id: item.id,
                      title: item.title,
                      start_time: item.start_time,
                      status: item.status,
                      patient: item.patient
                  }));
                  setAppointments(formattedApts);
              }
          }
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    window.addEventListener('focus', fetchData);
    fetchData();
    return () => window.removeEventListener('focus', fetchData);
  }, []);

  const formatTime = (isoString: string) => format(parseISO(isoString), 'h:mm a', { locale: es });
  
  const getDayLabel = (isoString: string) => {
    const date = parseISO(isoString);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return format(date, 'EEEE d', { locale: es });
  };

  const groupedAppointments = appointments.reduce((acc, apt) => {
    const day = getDayLabel(apt.start_time);
    if (!acc[day]) acc[day] = [];
    acc[day].push(apt);
    return acc;
  }, {} as Record<string, DashboardAppointment[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 font-sans w-full overflow-x-hidden flex flex-col relative">
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden px-5 pt-6 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-gray-100 dark:border-slate-800 shadow-sm w-full">
        <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Logo" className="w-9 h-9 rounded-lg object-cover shadow-sm" />
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{dateStr}</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight">MediScribe AI</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-brand-teal relative transition-colors">
                <Bell size={22} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div onClick={() => navigate('/settings')} className="h-9 w-9 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer border-2 border-white dark:border-slate-800">
                {doctorName.charAt(4) || 'D'}
            </div>
        </div>
      </div>

      {/* HEADER ESCRITORIO */}
      <div className="hidden md:block px-8 pt-8 pb-4 w-full max-w-7xl mx-auto">
         <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tablero Principal</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800/30">
                <ShieldCheck size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-xs font-bold text-green-700 dark:text-green-300">Privacy Shield™</span>
            </div>
         </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 p-4 md:p-8 space-y-6 animate-fade-in-up w-full max-w-5xl mx-auto pb-32 md:pb-8">
        
        {/* SALUDO */}
        <div className="flex justify-between items-end">
            <div className="mt-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                    {dynamicGreeting.greeting.replace("Hola, ", "Hola, ")} 
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {dynamicGreeting.message}
                </p>
            </div>
            
            <button onClick={() => setIsUploadModalOpen(true)} className="hidden md:flex bg-brand-teal text-white px-4 py-2 rounded-xl font-bold items-center gap-2 shadow-lg hover:bg-teal-600 transition-transform active:scale-95">
              <Upload size={18} />
              <span>Subir Archivos</span>
            </button>
        </div>

        {/* TARJETA CLIMA + RELOJ */}
        <div className={`${heroStyle.bg} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex justify-between items-center transition-all duration-500 w-full min-h-[140px]`}>
            
            <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5">
                        <MapPin size={11} className="text-white"/>
                        <span className="text-[10px] font-bold uppercase tracking-wide">Consultorio</span>
                    </div>
                </div>
                <div className="flex items-end gap-3">
                    <h2 className="text-5xl font-bold tracking-tighter leading-none">{weather.temp}°</h2>
                    <div className="mb-1">
                        <p className="text-lg font-bold leading-none">{appointments.filter(a => isToday(parseISO(a.start_time))).length} Citas</p>
                        <p className={`text-xs font-medium ${heroStyle.text} opacity-90`}>Hoy</p>
                    </div>
                </div>
                <div className="md:hidden block">
                    <LiveClock mobile={true} />
                </div>
            </div>

            <div className="hidden md:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
               <LiveClock />
            </div>

            <div className="relative z-10 transform translate-x-2 drop-shadow-lg transition-transform duration-1000 hover:scale-110">
                {getWeatherIcon()}
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        {/* BOTÓN MÓVIL */}
        <button onClick={() => setIsUploadModalOpen(true)} className="md:hidden w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm active:scale-95 transition-transform">
          <div className="flex items-center gap-3">
            <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-full text-brand-teal"><Upload size={20} /></div>
            <div className="text-left">
              <p className="font-bold text-slate-800 dark:text-white text-sm">Subir Archivos</p>
              <p className="text-xs text-slate-500">Gestión documental</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        {/* AGENDA INTELIGENTE */}
        <section className="w-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="text-brand-teal" size={20}/> Próximos Pacientes
                </h3>
                {appointments.length > 0 && (
                    <button onClick={() => navigate('/calendar')} className="text-brand-teal text-xs font-bold uppercase tracking-wide bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                        Ver Todo
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">Sincronizando agenda...</div>
            ) : appointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar size={20} className="text-slate-400"/>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Tu agenda está libre.</p>
                    <p className="text-slate-400 text-xs mt-1 mb-4">No hay citas programadas para los próximos 7 días.</p>
                    <button onClick={() => navigate('/consultation')} className="w-full bg-slate-800 dark:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                        <Stethoscope size={16}/> Iniciar Consulta
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedAppointments).map(([day, dayApts]) => (
                        <div key={day} className="animate-fade-in-up">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">{day}</h4>
                            <div className="grid gap-3">
                                {dayApts.map((apt) => (
                                    <div 
                                        key={apt.id} 
                                        onClick={() => navigate('/calendar')}
                                        className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all cursor-pointer flex items-center gap-4"
                                    >
                                        <div className="flex flex-col items-center justify-center h-14 w-16 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 transition-colors">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Hora</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatTime(apt.start_time)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-base truncate group-hover:text-brand-teal transition-colors">
                                                {apt.patient?.name || "Sin nombre"}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <UserCircle size={12}/>
                                                <span className="truncate">{apt.title || 'Consulta General'}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                    apt.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {apt.status === 'scheduled' ? 'Confirmada' : apt.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="hidden md:block p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-300 group-hover:text-brand-teal transition-colors">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
      </div>

      {/* BOTÓN FLOTANTE DEL ASISTENTE DE VOZ (FAB) */}
      <button 
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-300"
      >
        <Bot size={32} />
      </button>

      {/* MODAL DE SUBIDA */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-brand-teal" /> Subir Archivos
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 mb-2">
                Seleccione un paciente para asignar el documento.
              </div>
              <UploadMedico onUploadComplete={() => {}}/>
              <div className="pt-4 border-t dark:border-slate-800">
                <DoctorFileGallery />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEL ASISTENTE DE VOZ */}
      <AssistantModal 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)} 
        onActionComplete={fetchData} // Recargar agenda al confirmar
      />

    </div>
  );
};

export default Dashboard;