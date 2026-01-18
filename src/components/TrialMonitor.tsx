import React, { useEffect, useState } from 'react';
import { AlertTriangle, Unlock, ShieldCheck, Clock } from 'lucide-react'; 
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'; // <--- Importante para la notificación
import { SubscriptionPlans } from './SubscriptionPlans';

const TRIAL_DAYS = 15;

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyAccess, setEmergencyAccess] = useState(false); 
  // Eliminamos 'isMinimized' porque ya no hay widget visual permanente
  
  const navigate = useNavigate();

  useEffect(() => {
    checkTrialStatus();
  }, []);

  // --- NUEVO: Efecto para lanzar la notificación temporal ---
  useEffect(() => {
      if (!loading && daysLeft !== null && daysLeft > 0 && !emergencyAccess) {
          // Retraso leve para que la animación de entrada de la app termine antes de mostrar el aviso
          const timer = setTimeout(() => {
              toast.message('Estado de la Cuenta', {
                  description: (
                      <span className="flex items-center gap-2">
                          <Clock size={14} className="text-amber-500"/>
                          <span>Periodo de prueba activo: <strong className="text-amber-600">{daysLeft} días restantes</strong></span>
                      </span>
                  ),
                  duration: 5000, // Desaparece en 5 segundos
                  style: {
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid #e2e8f0',
                  }
              });
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, [loading, daysLeft, emergencyAccess]);

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

  const handleEmergencyAccess = () => {
      if (confirm("⚠️ ¿Confirmar Acceso de Emergencia?\n\nSe habilitará el sistema temporalmente para no interrumpir la atención clínica.")) {
          setEmergencyAccess(true);
      }
  };

  if (loading) return null;

  // 🔴 CASO 1: PRUEBA TERMINADA (BLOQUEO TOTAL) - Se mantiene igual
  if (daysLeft !== null && daysLeft <= 0 && !emergencyAccess) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl p-1 shadow-2xl border border-slate-700 relative animate-in fade-in zoom-in-95 duration-300">
            
            <div className="p-8 pb-0 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full font-bold text-xs uppercase tracking-wider mb-4">
                    <AlertTriangle size={14} /> Periodo de Prueba Finalizado
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Elija su Plan Profesional</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Sus datos están seguros, pero el acceso de edición se ha pausado. Active su licencia para continuar operando sin límites.
                </p>
            </div>

            <div className="p-4">
                <SubscriptionPlans />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-b-3xl border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <ShieldCheck size={16} className="text-emerald-500"/>
                    <span>Garantía de Seguridad de Datos SSL • Cancelación en cualquier momento</span>
                </div>
                
                <button 
                    onClick={handleEmergencyAccess}
                    className="text-slate-400 hover:text-red-500 font-bold text-xs flex items-center gap-2 transition-colors underline decoration-dotted"
                >
                    <Unlock size={14} /> Acceso de Emergencia (Solo Lectura / Urgencias)
                </button>
            </div>

        </div>
      </div>
    );
  }

  // 🟠 CASO 2: MODO EMERGENCIA (BANNER FIJO SUPERIOR) - Se mantiene igual por seguridad
  if (emergencyAccess) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 flex justify-between items-center shadow-lg animate-in slide-in-from-top">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg animate-pulse"><AlertTriangle size={16} /></div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-90">Modo Emergencia Activado</p>
                    <p className="text-sm font-medium">Sistema habilitado temporalmente. Regularice su cuenta lo antes posible.</p>
                </div>
            </div>
            <button 
                onClick={() => window.location.reload()} 
                className="px-5 py-2 bg-white text-red-600 text-xs font-bold rounded-xl shadow-sm hover:bg-red-50 hover:scale-105 transition-all"
            >
                VER PLANES
            </button>
        </div>
      );
  }

  // 🟢 CASO 3: PRUEBA ACTIVA
  // Retornamos NULL para no renderizar nada visual permanente.
  // La notificación (Toast) se encargará de avisar vía el useEffect de arriba.
  return null;
};