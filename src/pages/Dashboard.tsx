import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Bell, CloudRain, Cloud, 
  ShieldCheck, Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, UserCircle, ArrowRight, AlertTriangle, FileText,
  Clock, TrendingUp, UserPlus, Zap, Activity, LogOut,
  CalendarX, Repeat, Ban, PlayCircle, PenLine, Calculator, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, addDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';
import { toast } from 'sonner';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AssistantService } from '../services/AssistantService';
import { AgentResponse } from '../services/GeminiAgent';
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

// IMPORTACIÓN DE WIDGETS
import { QuickNotes } from '../components/QuickNotes';
import { MedicalCalculators } from '../components/MedicalCalculators';

// --- INTERFACES & TIPOS ---
interface DashboardAppointment {
  id: string;
  title: string;
  start_time: string;
  status: string;
  patient?: {
    id: string;
    name: string;
    history?: string; 
  };
  criticalAlert?: string | null;
}

// --- MICRO COMPONENTES UI ---

const AssistantModal = ({ isOpen, onClose, onActionComplete }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void }) => {
  // ... (Lógica del asistente se mantiene idéntica, solo copiamos la estructura visual) ...
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'confirming'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const navigate = useNavigate(); 

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
    if (!aiResponse) return;
    switch (aiResponse.intent) {
      case 'CREATE_APPOINTMENT':
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("No autenticado");
          const { error } = await supabase.from('appointments').insert({
            doctor_id: user.id,
            title: aiResponse.data.patientName || "Cita Agendada",
            start_time: aiResponse.data.start_time,
            duration_minutes: aiResponse.data.duration_minutes || 30,
            status: 'scheduled',
            notes: aiResponse.data.notes || "Agendado por Voz",
            patient_id: null 
          });
          if (error) throw error;
          toast.success("✅ Cita agendada correctamente");
          onActionComplete(); 
          onClose();
        } catch (e: any) { toast.error("Error al guardar: " + e.message); }
        break;
      case 'NAVIGATION':
        const dest = aiResponse.data.destination?.toLowerCase();
        onClose();
        if (dest.includes('agenda')) navigate('/agenda');
        else if (dest.includes('paciente')) navigate('/patients');
        else if (dest.includes('config')) navigate('/settings');
        else navigate('/');
        toast.success(`Navegando a: ${dest}`);
        break;
      case 'MEDICAL_QUERY': toast.info("Consulta médica resuelta"); break;
      default: toast.info("No entendí la acción, intenta de nuevo."); setStatus('idle'); resetTranscript();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Bot size={48} className="mx-auto mb-3 relative z-10 drop-shadow-lg" />
          <h3 className="text-2xl font-black relative z-10 tracking-tight">Copiloto Clínico</h3>
          <p className="text-indigo-100 text-sm relative z-10 font-medium">Escuchando órdenes médicas...</p>
        </div>
        <div className="p-8">
          {status !== 'confirming' && (
            <div className="flex flex-col items-center gap-8">
               <div className={`text-center text-xl font-medium leading-relaxed ${transcript ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                 "{transcript || 'Diga un comando...'}"
               </div>
               {status === 'processing' ? (
                 <div className="flex items-center gap-2 text-indigo-600 font-bold animate-pulse">
                   <Loader2 className="animate-spin" /> Procesando...
                 </div>
               ) : (
                 <button onClick={handleToggleRecord} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-100' : 'bg-slate-900 text-white hover:bg-black hover:scale-105'}`}>
                   {isListening ? <Square size={28} fill="currentColor"/> : <Mic size={28} />}
                 </button>
               )}
            </div>
          )}
          {status === 'confirming' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-500 shrink-0 mt-1"/>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Acción Detectada</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{aiResponse.message}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); }} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleExecute} className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 flex items-center justify-center gap-2">Ejecutar <ChevronRight size={18}/></button>
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-50 p-4 text-center"><button onClick={onClose} className="text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-slate-600">Cerrar</button></div>
      </div>
    </div>
  );
};

// --- WIDGET CLIMA/RELOJ (ESTILO "GLASS") ---
const StatusWidget = ({ weather, totalApts, pendingApts, isNight }: { weather: any, totalApts: number, pendingApts: number, isNight: boolean }) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
    const completed = totalApts - pendingApts;
    const progress = totalApts > 0 ? (completed / totalApts) * 100 : 0;

    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/50 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none h-full flex flex-col justify-between relative overflow-hidden group">
             {/* Degradado de fondo sutil */}
             <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-blue-50/50 opacity-50"></div>
             
             <div className="flex justify-between items-start z-10 relative">
                 <div>
                     <div className="flex items-baseline gap-1">
                        <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{format(time, 'h:mm')}</p>
                        <span className="text-sm font-bold text-slate-400">{format(time, 'a')}</span>
                     </div>
                     <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {format(time, "EEEE d, MMM", { locale: es })}
                     </p>
                 </div>
                 <div className="text-right bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl backdrop-blur-sm border border-white/60 shadow-sm">
                    <div className="flex items-center gap-2 justify-end">
                        {isNight ? <Moon size={22} className="text-indigo-500"/> : <Sun size={22} className="text-amber-400"/>}
                        <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{weather.temp}°</span>
                    </div>
                 </div>
             </div>

             <div className="mt-4 z-10 relative">
                 <div className="flex justify-between text-xs font-bold mb-2">
                     <span className="text-slate-500 flex items-center gap-1"><Activity size={12}/> Progreso Diario</span>
                     <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{completed}/{totalApts} Pacientes</span>
                 </div>
                 <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50">
                     <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{width: `${progress}%`}}></div>
                 </div>
             </div>
        </div>
    );
};

// --- TARJETA HERO (CALIDEZ VISUAL) ---
const HeroPatientCard = ({ nextApt, onStart }: { nextApt: DashboardAppointment | null, onStart: (apt: DashboardAppointment) => void }) => {
    if (!nextApt) return (
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-6 h-full flex flex-col justify-center items-center text-center relative overflow-hidden shadow-inner border border-slate-200">
            <div className="bg-white p-4 rounded-full mb-4 shadow-sm"><Sparkles size={32} className="text-slate-400" /></div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Agenda Despejada</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-xs font-medium">No hay citas inmediatas. ¡Tómate un café, Doctor!</p>
        </div>
    );

    const isUrgent = isPast(parseISO(nextApt.start_time));
    
    return (
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[2rem] p-1 shadow-2xl shadow-slate-300/50 dark:shadow-none h-full flex flex-col relative overflow-hidden group text-white">
            {/* Fondo decorativo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="h-full bg-slate-900/50 backdrop-blur-sm rounded-[1.8rem] p-6 flex flex-col relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className={`flex h-2 w-2 relative`}>
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUrgent ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isUrgent ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {isUrgent ? 'En Espera' : 'Siguiente'}
                            </span>
                         </div>
                         <h2 className="text-3xl font-bold leading-tight line-clamp-1">{nextApt.title}</h2>
                    </div>
                    <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                        <span className="text-xl font-bold block leading-none text-center">{format(parseISO(nextApt.start_time), 'h:mm')}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 text-center block">{format(parseISO(nextApt.start_time), 'a')}</span>
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300"><UserCircle size={20}/></div>
                        <div>
                            <p className="text-sm text-slate-300">{nextApt.patient ? 'Expediente Activo' : 'Primera Vez / Sin Registro'}</p>
                            {nextApt.criticalAlert && (
                                <p className="text-xs text-red-300 flex items-center gap-1 mt-0.5"><AlertTriangle size={10}/> {nextApt.criticalAlert.substring(0,25)}...</p>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => onStart(nextApt)}
                    className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-sm shadow-lg hover:bg-teal-50 transition-all active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-teal-500/20"
                >
                    <PlayCircle size={18} className="text-teal-600"/> INICIAR CONSULTA
                </button>
            </div>
        </div>
    );
};

// --- LAYOUT PRINCIPAL ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0); 
  const [toolsTab, setToolsTab] = useState<'notes' | 'calc'>('notes');
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // --- LOGICA DE DATOS (INTACTA) ---
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
            } catch (e) { console.log("Error clima API", e); }
        }, (error) => { console.warn("Ubicación denegada/error", error); });
    }
  }, []);

  const extractAllergies = (historyJSON: string | undefined): string | null => {
      if (!historyJSON) return null;
      try {
          const h = JSON.parse(historyJSON);
          const allergies = h.allergies || h.legacyNote;
          const clean = allergies?.replace(/^alergia[s]?\s*[:]\s*/i, '') || '';
          return (clean && clean.length > 2 && !clean.toLowerCase().includes("negada")) ? clean : null;
      } catch { return null; }
  };

  const fetchData = useCallback(async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
          const rawName = profile?.full_name?.split(' ')[0] || 'Colega';
          setDoctorName(`Dr. ${rawName}`);
          const { data: consultations } = await supabase.from('consultations').select('real_duration_seconds').eq('doctor_id', user.id);
          if (consultations) {
              const sumSeconds = consultations.reduce((acc, curr) => acc + (curr.real_duration_seconds || 0), 0);
              setTotalSeconds(sumSeconds);
          }
          const todayStart = startOfDay(new Date()); 
          const nextWeekEnd = endOfDay(addDays(new Date(), 7));
          const { data: aptsData, error } = await supabase.from('appointments').select(`id, title, start_time, status, patient:patients (id, name, history)`).eq('doctor_id', user.id).gte('start_time', todayStart.toISOString()).lte('start_time', nextWeekEnd.toISOString()).neq('status', 'cancelled').neq('status', 'completed').order('start_time', { ascending: true }).limit(15);
          if (error) throw error;
          if (aptsData) {
              const formattedApts: DashboardAppointment[] = aptsData.map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  start_time: item.start_time,
                  status: item.status,
                  patient: item.patient,
                  criticalAlert: extractAllergies(item.patient?.history) 
              }));
              setAppointments(formattedApts);
          }
      } catch (e) { console.error("Error cargando dashboard:", e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { window.addEventListener('focus', fetchData); fetchData(); return () => window.removeEventListener('focus', fetchData); }, [fetchData]);

  const handleQuickAction = async (action: 'reschedule' | 'noshow' | 'cancel', apt: DashboardAppointment) => {
    try {
        if (action === 'noshow') {
            await supabase.from('appointments').update({ status: 'cancelled', notes: 'No asistió (Marcado desde Dashboard)' }).eq('id', apt.id);
            toast.success("Marcado como inasistencia");
        } else if (action === 'cancel') {
            if(confirm('¿Seguro que desea cancelar esta cita?')) {
                await supabase.from('appointments').update({ status: 'cancelled', notes: 'Cancelada por el usuario desde Dashboard' }).eq('id', apt.id);
                toast.success("Cita cancelada correctamente");
            } else return;
        } else if (action === 'reschedule') {
            const newDate = addDays(parseISO(apt.start_time), 1);
            await supabase.from('appointments').update({ start_time: newDate.toISOString(), status: 'scheduled' }).eq('id', apt.id);
            toast.success("Reagendada para mañana");
        }
        fetchData();
    } catch (e) { toast.error("Error al actualizar cita"); }
  };

  const handleStartConsultation = (apt: DashboardAppointment) => {
      const patientData = apt.patient ? { id: apt.patient.id, name: apt.patient.name, history: apt.patient.history } : { id: `ghost_${apt.id}`, name: apt.title, isGhost: true, appointmentId: apt.id };
      navigate('/consultation', { state: { patientData: patientData, linkedAppointmentId: apt.id } });
  };

  const nextPatient = useMemo(() => {
      const scheduled = appointments.filter(a => a.status === 'scheduled');
      return scheduled.length > 0 ? scheduled[0] : null;
  }, [appointments]);

  const todayAppointments = useMemo(() => appointments.filter(a => isToday(parseISO(a.start_time))), [appointments]);
  
  const groupedAppointments = useMemo(() => appointments.reduce((acc, apt) => {
    const day = isToday(parseISO(apt.start_time)) ? 'Hoy' : isTomorrow(parseISO(apt.start_time)) ? 'Mañana' : format(parseISO(apt.start_time), 'EEEE d', { locale: es });
    if (!acc[day]) acc[day] = [];
    acc[day].push(apt);
    return acc;
  }, {} as Record<string, DashboardAppointment[]>), [appointments]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans w-full pb-32 md:pb-8 relative overflow-hidden">
      
      {/* FONDO "AURORA" PARA QUITAR LO FRÍO */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-teal-50/50 via-indigo-50/30 to-transparent dark:from-slate-900 dark:via-slate-900 -z-10 pointer-events-none" />

      {/* HEADER MÓVIL */}
      <div className="md:hidden px-5 pt-6 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md dark:bg-slate-900 sticky top-0 z-30 border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Logo" className="w-9 h-9 rounded-lg shadow-sm" />
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dateStr}</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white">MediScribe</span>
            </div>
        </div>
        <div onClick={() => navigate('/settings')} className="h-9 w-9 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
            {doctorName.charAt(4) || 'D'}
        </div>
      </div>

      {/* HEADER ESCRITORIO */}
      <div className="hidden md:flex justify-between items-end px-8 pt-8 pb-6 max-w-7xl mx-auto w-full">
         <div>
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{dynamicGreeting.greeting}</h1>
             <p className="text-slate-500 text-sm mt-1 font-medium">{dynamicGreeting.message}</p>
         </div>
         <div className="flex gap-3">
             <button onClick={() => setIsAssistantOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                 <Bot size={16}/> Asistente
             </button>
             <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors active:scale-95">
                 <Upload size={16}/> Archivos
             </button>
         </div>
      </div>

      {/* --- BENTO GRID PRINCIPAL --- */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ZONA IZQUIERDA (OPERATIVA) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* FILA SUPERIOR: HERO (Ahora oscuro/vibrante) + STATUS (Glass) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-64">
                  <HeroPatientCard nextApt={nextPatient} onStart={handleStartConsultation} />
                  <StatusWidget weather={weather} totalApts={todayAppointments.length + 5} pendingApts={todayAppointments.length} isNight={isNight} />
              </div>

              {/* LISTA DE AGENDA (Con más "cuerpo") */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none min-h-[400px]">
                  <div className="flex justify-between items-center mb-6 px-2">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                          <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Calendar size={20}/></div>
                          Agenda Clínica
                      </h3>
                      <button onClick={() => navigate('/calendar')} className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors">
                          Ver Completo
                      </button>
                  </div>
                  
                  {loading ? (
                       <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300"/></div>
                  ) : appointments.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 mx-2">
                           <div className="bg-white p-4 rounded-full shadow-sm mb-4"><CalendarX size={32} className="text-slate-300"/></div>
                           <p className="font-medium text-slate-600">Agenda libre por ahora</p>
                           <p className="text-xs mt-1">Disfruta tu tiempo libre, Doc.</p>
                       </div>
                  ) : (
                      <div className="space-y-8 px-2">
                          {Object.entries(groupedAppointments).map(([day, apts]) => (
                              <div key={day}>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {day}
                                  </h4>
                                  <div className="space-y-3">
                                      {apts.map(apt => {
                                          const isOverdue = isPast(parseISO(apt.start_time)) && apt.status === 'scheduled';
                                          return (
                                              <div key={apt.id} className="flex group relative pl-4">
                                                  {/* Línea de tiempo */}
                                                  <div className="absolute left-[7px] top-8 bottom-0 w-0.5 bg-slate-100 group-last:hidden"></div>
                                                  
                                                  <div className="w-16 text-right pr-4 pt-4 relative">
                                                      <span className="block font-black text-slate-700 dark:text-slate-300 text-sm">{format(parseISO(apt.start_time), 'h:mm')}</span>
                                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(apt.start_time), 'a')}</span>
                                                      <div className={`absolute right-[-5px] top-[22px] w-2.5 h-2.5 rounded-full border-2 border-white ${isOverdue ? 'bg-amber-400' : 'bg-teal-500'}`}></div>
                                                  </div>
                                                  
                                                  <div className="flex-1 bg-white border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center hover:shadow-lg hover:border-teal-100 transition-all cursor-pointer group-hover:translate-x-1">
                                                      <div className="flex items-center gap-4">
                                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${apt.patient ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                                                              {apt.title.charAt(0)}
                                                          </div>
                                                          <div>
                                                              <h5 className="font-bold text-slate-800 dark:text-white text-base">{apt.title}</h5>
                                                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                                  {apt.patient ? <UserCircle size={12}/> : <Clock size={12}/>}
                                                                  {apt.patient ? 'Expediente Activo' : 'Cita Rápida'}
                                                              </p>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <button onClick={() => handleQuickAction('reschedule', apt)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-colors" title="Reagendar"><Repeat size={16}/></button>
                                                          <button onClick={() => handleQuickAction('cancel', apt)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors" title="Cancelar"><Ban size={16}/></button>
                                                          <button onClick={() => handleStartConsultation(apt)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors shadow-md"><PlayCircle size={16}/></button>
                                                      </div>
                                                  </div>
                                              </div>
                                          )
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          {/* ZONA DERECHA (HERRAMIENTAS) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
              
              {/* CONTENEDOR DE TABS (Ahora blanco puro con sombra suave) */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col h-full min-h-[500px]">
                  <div className="flex p-2 bg-slate-50/50 gap-2">
                      <button 
                        onClick={() => setToolsTab('notes')}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${toolsTab === 'notes' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          <PenLine size={14}/> Notas
                      </button>
                      <button 
                        onClick={() => setToolsTab('calc')}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${toolsTab === 'calc' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          <Calculator size={14}/> Calculadora
                      </button>
                  </div>
                  
                  <div className="p-4 flex-1">
                      {toolsTab === 'notes' ? (
                          <div className="h-full animate-fade-in"><QuickNotes /></div>
                      ) : (
                          <div className="h-full animate-fade-in"><MedicalCalculators /></div>
                      )}
                  </div>
              </div>

              {/* BOTONES RÁPIDOS (Ahora con color de fondo) */}
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => navigate('/consultation')} className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800 active:scale-95">
                      <div className="bg-white p-2 rounded-full shadow-sm"><Stethoscope size={20} className="text-emerald-600"/></div>
                      Consulta Libre
                  </button>
                  <button onClick={() => navigate('/patients')} className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800 active:scale-95">
                      <div className="bg-white p-2 rounded-full shadow-sm"><UserPlus size={20} className="text-blue-600"/></div>
                      Nuevo Paciente
                  </button>
              </div>

          </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Upload size={18} className="text-teal-600" /> Subir Archivos</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <UploadMedico onUploadComplete={() => {}}/>
              <div className="pt-4 border-t dark:border-slate-800"><DoctorFileGallery /></div>
            </div>
          </div>
        </div>
      )}

      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} />
    </div>
  );
};

export default Dashboard;