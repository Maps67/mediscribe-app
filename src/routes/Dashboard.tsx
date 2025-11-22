import React, { useEffect, useState } from 'react';
import { Users, Activity, FileText, ShieldCheck, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [doctorName, setDoctorName] = useState('');
  const [stats, setStats] = useState({
    totalPatients: 0,
    consultationsToday: 0,
    totalConsultations: 0,
    nextAppt: '---'
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setDoctorName(profile?.full_name || 'Doctor');

      const { count: patientsCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
      const { count: totalConsul } = await supabase.from('consultations').select('*', { count: 'exact', head: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayConsul } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Buscar próxima cita real
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
          // Si no es hoy, mostramos fecha
          if (date.getDate() !== new Date().getDate()) {
             nextApptString = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + nextApptString;
          }
      }

      setStats({
        totalPatients: patientsCount || 0,
        totalConsultations: totalConsul || 0,
        consultationsToday: todayConsul || 0,
        nextAppt: nextApptString
      });

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Panel Principal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         
         {/* CARD 1: PACIENTES (CLICK -> PACIENTES) */}
         <div 
            onClick={() => navigate('/patients')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
         >
            <div className="flex items-center justify-between mb-4">
               <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={24} /></div>
               <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={20}/>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Pacientes Totales</h3>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPatients}</p>
         </div>

         {/* CARD 2: CONSULTAS HOY (CLICK -> AGENDA) */}
         <div 
            onClick={() => navigate('/appointments')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
         >
            <div className="flex items-center justify-between mb-4">
               <div className="bg-teal-100 p-2 rounded-lg text-brand-teal group-hover:bg-brand-teal group-hover:text-white transition-colors"><Activity size={24} /></div>
               <ChevronRight className="text-slate-300 group-hover:text-brand-teal" size={20}/>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Consultas Hoy</h3>
            <p className="text-2xl font-bold text-slate-800">{stats.consultationsToday}</p>
         </div>

         {/* CARD 3: PROXIMA CITA (CLICK -> AGENDA) */}
         <div 
            onClick={() => navigate('/appointments')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
         >
             <div className="flex items-center justify-between mb-4">
               <div className="bg-purple-100 p-2 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"><Clock size={24} /></div>
               <ChevronRight className="text-slate-300 group-hover:text-purple-500" size={20}/>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Próxima Cita</h3>
            <p className="text-xl font-bold text-slate-800 truncate">{stats.nextAppt}</p>
         </div>

         {/* CARD 4: SISTEMA (NO CLICK) */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><ShieldCheck size={24} /></div>
               <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded flex items-center gap-1">● Online</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Estado Sistema</h3>
            <p className="text-xl font-bold text-slate-800">Encriptado</p>
         </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-teal to-blue-600"></div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-teal/5 rounded-full blur-3xl"></div>

          <div className="p-4 bg-slate-50 rounded-full mb-6 animate-fade-in-up">
             <Sparkles size={48} className="text-brand-teal opacity-80" />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            Bienvenido, <span className="text-brand-teal">{doctorName}</span>
          </h3>
          
          <p className="text-slate-500 max-w-lg mt-2 leading-relaxed">
              Su consultorio inteligente está activo. Seleccione <span className="font-bold text-slate-700">Consulta IA</span> para comenzar.
          </p>

          <button onClick={() => navigate('/consultation')} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2">
            Comenzar Nueva Consulta <Activity size={18} />
          </button>
      </div>
    </div>
  );
};

export default Dashboard;