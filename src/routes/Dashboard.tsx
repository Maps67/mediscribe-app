import React, { useEffect, useState } from 'react';
import { Users, Activity, ShieldCheck, Sparkles, Clock, ChevronRight, Sun, Moon, Sunrise, MessageCircle, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Banco de Frases y Tips
const TIPS_AND_QUOTES = [
  "La medicina es la más humana de las artes, la más artística de las ciencias. - Edmund Pellegrino",
  "Donde quiera que se ama el arte de la medicina, se ama también a la humanidad. - Hipócrates",
  "Tip: Usa el micrófono en ambientes con poco ruido para mayor precisión.",
  "Tip: Puedes editar cualquier nota antes de guardarla en el historial.",
  "El buen médico trata la enfermedad; el gran médico trata al paciente que tiene la enfermedad. - William Osler",
  "Tip: Recuerda actualizar tu firma digital en Configuración para tus recetas.",
  "La salud es el regalo más valioso. - Buda",
  "Tip: Puedes compartir la receta por WhatsApp directamente desde el historial.",
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [doctorName, setDoctorName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  const [stats, setStats] = useState({
    totalPatients: 0,
    consultationsToday: 0,
    totalConsultations: 0,
    nextAppt: '---'
  });

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

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return <Sunrise className="text-orange-400" size={32} />;
    if (hour < 19) return <Sun className="text-yellow-500" size={32} />;
    return <Moon className="text-indigo-400" size={32} />;
  };

  // --- ACCIÓN DE SOPORTE TÉCNICO ---
  const handleSupport = () => {
    // TU NÚMERO AQUÍ (Formato Internacional sin +)
    const SUPPORT_PHONE = "523330583807"; 
    const message = "Hola Soporte MediScribe, necesito ayuda con la plataforma.";
    window.open(`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
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
      const { count: todayConsul } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

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
        totalConsultations: 0, 
        consultationsToday: todayConsul || 0,
        nextAppt: nextApptString 
      });

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-40 bg-slate-100 rounded-xl mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-50 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      
      {/* HERO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-brand-teal"></div>
          
          <div className="flex-1 z-10 text-center md:text-left mb-6 md:mb-0">
             <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                {getGreetingIcon()}
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
                    {greeting}, <span className="text-brand-teal">{doctorName.split(' ')[0]}</span>
                </h2>
             </div>
             <p className="text-slate-500 italic text-sm lg:text-base max-w-xl mx-auto md:mx-0 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
                "{quote}"
             </p>
          </div>

          <div className="z-10">
             <button 
                onClick={() => navigate('/consultation')}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
             >
                <Activity size={20} /> Iniciar Consulta
             </button>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-gradient-to-br from-brand-teal/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>
      
      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
         <div onClick={() => navigate('/patients')} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
               <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={20} /></div>
               <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={16}/>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPatients}</p>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Pacientes Totales</p>
         </div>

         <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
               <div className="bg-teal-50 p-2 rounded-lg text-brand-teal group-hover:bg-brand-teal group-hover:text-white transition-colors"><Activity size={20} /></div>
               <ChevronRight onClick={(e) => {e.stopPropagation(); navigate('/consultation')}} className="text-slate-300 group-hover:text-brand-teal" size={16}/>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.consultationsToday}</p>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Consultas Hoy</p>
         </div>

         <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
             <div className="flex items-center justify-between mb-2">
               <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Clock size={20} /></div>
               <ChevronRight className="text-slate-300 group-hover:text-purple-500" size={16}/>
            </div>
            <p className="text-xl font-bold text-slate-800 truncate">{stats.nextAppt}</p>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Próxima Cita</p>
         </div>

         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
               <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><ShieldCheck size={20} /></div>
               <div className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div> Online
               </div>
            </div>
            <p className="text-xl font-bold text-slate-800">Seguro</p>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Estado</p>
         </div>
      </div>
      
      {/* ACCESOS INFERIORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TARJETA DE SOPORTE ACTIVADA */}
        <div className="bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><HelpCircle size={20} className="text-teal-400"/> Soporte Técnico</h3>
                <p className="text-slate-300 text-xs mb-4 max-w-xs">¿Dudas o problemas? Contacta directamente a nuestro equipo de ingeniería.</p>
                <button 
                    onClick={handleSupport}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-500 transition-colors flex items-center gap-2 shadow-lg"
                >
                    <MessageCircle size={16} /> Contactar Soporte
                </button>
             </div>
             <Sparkles className="absolute bottom-[-20px] right-[-20px] text-white/5 w-32 h-32" />
        </div>
        
        <div className="bg-gradient-to-r from-brand-teal to-teal-600 text-white rounded-xl p-6 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/card')}>
             <h3 className="font-bold text-lg mb-1">Tarjeta Digital</h3>
             <p className="text-teal-100 text-xs mb-4">Comparte tu perfil profesional con un QR.</p>
             <div className="flex items-center gap-2 text-xs font-bold">Ver mi Tarjeta <ChevronRight size={14}/></div>
             <Users className="absolute bottom-[-20px] right-[-20px] text-white/10 w-32 h-32" />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;