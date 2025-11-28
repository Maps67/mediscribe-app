import React, { useEffect, useState } from 'react';
import { Clock, Lock, MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TRIAL_DAYS = 15;

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false); // Opción para ocultarlo temporalmente

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.created_at) {
      const startDate = new Date(user.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      const remaining = TRIAL_DAYS - diffDays;
      setDaysLeft(remaining);
    }
    setLoading(false);
  };

  const handleContactSupport = () => {
      window.open('https://wa.me/?text=Hola,%20mi%20prueba%20de%20MediScribe%20terminó%20y%20quiero%20continuar.', '_blank');
  };

  if (loading) return null;

  // 🔴 CASO 1: PRUEBA TERMINADA (BLOQUEO TOTAL - ESTE SE QUEDA GRANDE POR SEGURIDAD)
  if (daysLeft !== null && daysLeft <= 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Periodo de Prueba Finalizado</h2>
            <p className="text-slate-500 dark:text-slate-300 mb-6 text-sm">
                Han pasado los 15 días de acceso gratuito. Para continuar usando la Inteligencia Artificial y acceder a sus pacientes, por favor active su licencia.
            </p>
            <button onClick={handleContactSupport} className="w-full py-3 bg-brand-teal hover:bg-teal-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                <MessageCircle size={20}/> Contactar Soporte
            </button>
        </div>
      </div>
    );
  }

  // 🟢 CASO 2: PRUEBA ACTIVA (CÁPSULA FLOTANTE DISCRETA)
  if (isMinimized) return null; // Si el usuario lo cerró, no mostramos nada hasta recargar

  return (
    <div className="fixed z-40 bottom-20 right-4 md:bottom-4 md:right-4 animate-slide-in-right">
        {/* CÁPSULA PEQUEÑA */}
        <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl border border-slate-700 flex items-center gap-3 transition-all hover:scale-105 hover:bg-slate-900">
            
            {/* Icono animado */}
            <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-2 h-2 bg-green-400 rounded-full"></div>
            </div>

            {/* Texto Compacto */}
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Modo Prueba</span>
                <span className="text-xs font-bold leading-none">Quedan <span className="text-yellow-400">{daysLeft} días</span></span>
            </div>

            {/* Botón Cerrar (X) Pequeño */}
            <button 
                onClick={() => setIsMinimized(true)}
                className="ml-2 p-1 text-slate-500 hover:text-white rounded-full transition-colors"
                title="Ocultar por esta sesión"
            >
                <X size={14} />
            </button>
        </div>
    </div>
  );
};