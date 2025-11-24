import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Sun, Moon, Bell, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lógica de Tiempo y Diseño (El "Clima Visual")
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // Configuración de la Tarjeta Hero según hora
  const heroStyle = isNight 
    ? { bg: "bg-gradient-to-br from-slate-800 to-indigo-900", icon: <Moon size={64} className="text-indigo-200 opacity-80"/>, text: "text-indigo-100" }
    : { bg: "bg-gradient-to-br from-brand-teal to-teal-600", icon: <Sun size={64} className="text-yellow-300 opacity-80"/>, text: "text-teal-100" };

  useEffect(() => {
    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setDoctorName(profile?.full_name?.split(' ')[0] || 'Doctor');

                const today = new Date().toISOString().split('T')[0];
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('*, patients(name)')
                    .gte('start_time', `${today}T00:00:00`)
                    .lte('start_time', `${today}T23:59:59`)
                    .order('start_time', { ascending: true });
                setTodayAppointments(appointments || []);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 font-sans pb-24">
      
      {/* 1. HEADER MÓVIL COMPLETO (Ya no está vacío) */}
      <div className="md:hidden px-6 pt-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20 border-b border-gray-100 dark:border-slate-800">
        {/* Izquierda: Logo y Marca */}
        <div className="flex items-center gap-2">
            <img src="/pwa-192x192.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">MediScribe</span>
        </div>

        {/* Derecha: Perfil y Notificaciones (Llenando el espacio vacío) */}
        <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-brand-teal relative transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>
            </button>
            <div onClick={() => navigate('/settings')} className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shadow-sm cursor-pointer overflow-hidden">
                {doctorName.charAt(0) || 'D'}
            </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6 animate-fade-in-up max-w-5xl mx-auto">
        
        {/* Saludo Personal */}
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{dateStr}</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {dynamicGreeting.greeting}
            </h1>
        </div>

        {/* 2. TARJETA HERO "CLIMA/AGENDA" (Visualmente Atractiva) */}
        <div className={`${heroStyle.bg} rounded-3xl p-6 text-white shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden flex justify-between items-center transition-all duration-500`}>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg">
                        <MapPin size={14} className="text-white"/>
                    </div>
                    <span className={`text-xs font-bold ${heroStyle.text} uppercase tracking-wide`}>Consultorio Principal</span>
                </div>
                
                <h2 className="text-4xl font-bold mb-1">
                    {todayAppointments.length > 0 ? `${todayAppointments.length} Citas` : "Libre"}
                </h2>
                <p className={`text-sm ${heroStyle.text} font-medium`}>
                    {todayAppointments.length > 0 ? "Agenda activa hoy." : "Sin pacientes por ahora."}
                </p>
            </div>

            {/* El Elemento Visual (Sol/Luna) */}
            <div className="relative z-10 transform translate-x-2">
                {heroStyle.icon}
            </div>

            {/* Decoración de fondo (Círculos abstractos) */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
        </div>

        {/* 3. LISTA DE PACIENTES DE HOY (Timeline) */}
        <section>
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pacientes de Hoy</h3>
                {todayAppointments.length > 0 && (
                    <button onClick={() => navigate('/calendar')} className="text-brand-teal text-xs font-bold uppercase tracking-wide bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full">
                        Ver Calendario
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400 animate-pulse">Cargando tu día...</div>
            ) : todayAppointments.length === 0 ? (
                // Estado Vacío "Bonito"
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Tu agenda está despejada. ¿Un café?</p>
                    <button onClick={() => navigate('/consultation')} className="w-full bg-slate-900 dark:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg">
                        Iniciar Consulta Espontánea
                    </button>
                </div>
            ) : (
                // Lista Estilo iOS
                <div className="space-y-3">
                    {todayAppointments.map((app) => (
                        <div 
                            key={app.id} 
                            onClick={() => navigate('/calendar')}
                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                        >
                            {/* Hora */}
                            <div className="flex flex-col items-center justify-center h-12 w-14 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {new Date(app.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                </span>
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">{app.patient?.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.title || 'Consulta General'}</p>
                            </div>

                            <ChevronRight size={20} className="text-slate-300"/>
                        </div>
                    ))}
                </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;