import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronRight, AlignLeft, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fecha actual elegante
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // 1. Perfil
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            setDoctorName(profile?.full_name?.split(' ')[0] || 'Doctor'); // Solo el primer nombre para ser más personal

            // 2. Citas de HOY
            const today = new Date().toISOString().split('T')[0];
            const { data: appointments } = await supabase
                .from('appointments')
                .select('*, patients(name)')
                .gte('start_time', `${today}T00:00:00`)
                .lte('start_time', `${today}T23:59:59`)
                .order('start_time', { ascending: true });
            
            setTodayAppointments(appointments || []);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // Lógica para el mensaje del Widget Principal
  const getDailySummary = () => {
      const count = todayAppointments.length;
      if (count === 0) return { title: "Agenda Libre", subtitle: "No hay citas programadas hoy.", color: "from-blue-500 to-teal-400" };
      if (count <= 4) return { title: "Día Ligero", subtitle: `${count} citas programadas.`, color: "from-teal-500 to-green-400" };
      return { title: "Día Ocupado", subtitle: `${count} citas en agenda hoy.`, color: "from-indigo-500 to-purple-500" };
  };

  const summary = getDailySummary();

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 font-sans pb-24 sm:pb-8"> {/* Padding inferior extra para el menú móvil */}
      
      {/* HEADER MÓVIL (Solo visible en celular) */}
      <div className="md:hidden px-6 pt-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-gray-50 dark:border-slate-800">
        <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 capitalize">{dateStr}</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Hola, Dr. {doctorName}</h1>
        </div>
        <img src="/pwa-192x192.png" alt="Logo" className="w-10 h-10 rounded-xl border border-slate-100 shadow-sm" />
      </div>

      {/* HEADER ESCRITORIO (Oculto en móvil) */}
      <div className="hidden md:block px-8 pt-8 pb-4">
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Tablero Principal</h1>
         <p className="text-slate-500 mt-2">Resumen de actividades y agenda.</p>
      </div>


      <div className="p-4 md:p-8 space-y-6 animate-fade-in-up max-w-5xl mx-auto">

        {/* 1. WIDGET DE RESUMEN DEL DÍA (Inteligente) */}
        <div className={`rounded-3xl p-6 shadow-lg text-white bg-gradient-to-r ${summary.color} relative overflow-hidden`}>
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Resumen de Hoy</p>
                    <h2 className="text-3xl font-bold mb-1">{summary.title}</h2>
                    <p className="text-white/90 font-medium flex items-center gap-1">
                        <AlignLeft size={16}/> {summary.subtitle}
                    </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                    <Calendar size={32} className="text-white"/>
                </div>
            </div>
            {/* Decoración de fondo */}
            <div className="absolute -right-8 -bottom-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* 2. LISTA DE CITAS DE HOY (Estilo iOS) */}
        <section>
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={18} className="text-brand-teal"/> Agenda del Día
                </h3>
                {todayAppointments.length > 0 && (
                    <button onClick={() => navigate('/calendar')} className="text-brand-teal text-sm font-bold hover:underline">Ver calendario completo</button>
                )}
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-400">Cargando agenda...</div>
            ) : todayAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar size={24} className="text-slate-400 mb-0"/>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Sin citas programadas hoy.</p>
                    <p className="text-slate-400 text-sm mt-1">Disfruta tu tiempo libre o gestiona pendientes.</p>
                    <button onClick={() => navigate('/consultation')} className="mt-4 text-brand-teal text-sm font-bold flex items-center justify-center gap-1 mx-auto">
                        <Stethoscope size={16}/> Iniciar una consulta espontánea
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800 shadow-sm overflow-hidden">
                    {todayAppointments.map((app) => (
                        <div key={app.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer active:bg-gray-100" onClick={() => navigate('/calendar')}>
                            {/* Hora */}
                            <div className="flex flex-col items-center justify-center min-w-[60px] bg-slate-50 dark:bg-slate-800 py-2 rounded-xl">
                                <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                    {new Date(app.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}).slice(0,5)}
                                </span>
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{app.patient?.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                                    <MapPin size={10}/> {app.title || 'Consulta en Consultorio'}
                                </p>
                            </div>

                            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                                <ChevronRight size={16} className="text-slate-400"/>
                            </div>
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