import React from 'react';
import { Users, TrendingUp, Calendar, Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Panel Principal</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={24} /></div>
               <span className="text-green-500 text-sm font-bold">+12%</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Pacientes Totales</h3>
            <p className="text-2xl font-bold text-slate-800">1,284</p>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><Activity size={24} /></div>
               <span className="text-green-500 text-sm font-bold">+5%</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Consultas Hoy</h3>
            <p className="text-2xl font-bold text-slate-800">12</p>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Calendar size={24} /></div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Próxima Cita</h3>
            <p className="text-xl font-bold text-slate-800">14:30 PM</p>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><TrendingUp size={24} /></div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Eficiencia IA</h3>
            <p className="text-2xl font-bold text-slate-800">94%</p>
         </div>
      </div>
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center h-96">
         <img src="https://picsum.photos/seed/medical/300/200" alt="Medical" className="opacity-50 rounded-lg mb-4 grayscale" />
         <h3 className="text-xl font-semibold text-slate-800">Bienvenido Dr. Martínez</h3>
         <p className="text-slate-500 max-w-md mt-2">
            Seleccione <span className="font-bold text-teal-600">Consulta IA</span> en el menú lateral para comenzar a atender pacientes con la asistencia de JIA.
         </p>
      </div>
    </div>
  );
};

export default Dashboard;