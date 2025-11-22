import React, { useEffect, useState } from 'react';
import { Users, Activity, ShieldCheck, Sparkles, Clock, ChevronRight, Sun, Moon, Sunrise, MessageCircle, HelpCircle, ExternalLink, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const TIPS_AND_QUOTES = [
  "La medicina es la más humana de las artes. - Edmund Pellegrino",
  "Tip: Usa el micrófono en ambientes con poco ruido.",
  "Tip: Puedes editar cualquier nota antes de guardarla.",
  "El buen médico trata la enfermedad; el gran médico trata al paciente. - William Osler",
  "Tip: Recuerda actualizar tu firma digital en Configuración.",
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  // Renombrado consultationsToday a appointmentsToday para mayor claridad interna
  const [stats, setStats] = useState({ totalPatients: 0, appointmentsToday: 0, nextAppt: '---' });

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

  // --- TU NÚMERO DE SOPORTE (PIXEL ART STUDIO) ---
  const handleSupport = () => {
    const YOUR_WHATSAPP = "523330583807"; 
    const message = "Hola Pixel Art, soy usuario de MediScribe y necesito ayuda.";
    window.open(`https://wa.me/${YOUR_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Perfil del Doctor
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setDoctorName(profile?.full_name || 'Doctor');

      // 2. Total Pacientes
      const { count: patientsCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });

      // 3. Citas Hoy (CORREGIDO: Ahora mira 'appointments' en lugar de 'consultations')
      const today = new Date(); 
      today.setHours(0, 0, 0, 0); // Inicio del día
      
      const tomorrow = new Date(today); 
      tomorrow.setDate(tomorrow.getDate() + 1); // Fin del día (Inicio de mañana)

      const { count: appointmentsTodayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('date_time', today.toISOString())
        .lt('date_time', tomorrow.toISOString());

      // 4. Próxima Cita (Solo futuras)
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
          // Si la cita no es hoy, agregar fecha
          if (date.getDate() !== new Date().getDate()) {
            nextApptString = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + nextApptString;
          }
      }

      setStats({ 
        totalPatients: patientsCount || 0, 
        appointmentsToday: appointmentsTodayCount || 0, 
        nextAppt: nextApptString 
      });

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading) return <div className="p-6 max-w-6xl mx-auto animate-pulse"><div className="h-40 bg-slate-100 rounded-xl mb-8"></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-slate-50 rounded-xl"></div>)}</div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      
      {/* HERO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-teal"></div>
          <div className="flex-1 z-10 text-center md:text-left mb-4 md:mb-0">
             <h2 className="text-2xl font-bold text-slate-800 mb-1">{greeting}, <span className="text-brand-teal">{doctorName.split(' ')[0]}</span></h2>
             <p className="text-slate-400 text-sm italic">"{quote}"</p>
          </div>
          <div className="z-10">
             <button onClick={() => navigate('/consultation')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 hover:scale-105 transition-transform active:scale-95">
                <Activity size={18} /> Iniciar Consulta
             </button>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-gradient-to-br from-brand-teal/5 to-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>
      
      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         <div onClick={() => navigate('/patients')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer transition-all group">
            <div className="flex justify-between mb-2"><div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Users size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-blue-500" size={16}/></div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPatients}</p><p className="text-slate-400 text-xs font-bold uppercase">Pacientes</p>
         </div>
         <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-300 cursor-pointer transition-all group">
            <div className="flex justify-between mb-2"><div className="bg-teal-50 p-2 rounded-lg text-brand-teal"><Calendar size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-brand-teal" size={16}/></div>
            <p className="text-2xl font-bold text-slate-800">{stats.appointmentsToday}</p><p className="text-slate-400 text-xs font-bold uppercase">Citas Hoy</p>
         </div>
         <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-300 cursor-pointer transition-all group">
             <div className="flex justify-between mb-2"><div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Clock size={18}/></div><ChevronRight className="text-slate-300 group-hover:text-purple-500" size={16}/></div>
            <p className="text-xl font-bold text-slate-800 truncate">{stats.nextAppt}</p><p className="text-slate-400 text-xs font-bold uppercase">Siguiente Cita</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between mb-2"><div className="bg-orange-50 p-2 rounded-lg text-orange-600"><ShieldCheck size={18}/></div><div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div></div>
            <p className="text-xl font-bold text-slate-800">Seguro</p><p className="text-slate-400 text-xs font-bold uppercase">Estado</p>
         </div>
      </div>
      
      {/* FOOTER: TARJETA DIGITAL Y SOPORTE COMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Tarjeta Digital (Ocupa 2/3) */}
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

        {/* Soporte (Ocupa 1/3) - DISEÑO NUEVO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-center relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><HelpCircle size={16} className="text-blue-500"/> Soporte Técnico</h3>
                <button 
                    onClick={handleSupport}
                    className="w-full bg-blue-50 text-blue-600 text-xs font-bold py-2.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                    <MessageCircle size={14} /> Contactar a Pixel Art
                </button>
             </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;