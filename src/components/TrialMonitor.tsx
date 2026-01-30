import React, { useEffect, useState } from 'react';
import { AlertTriangle, Unlock, ShieldCheck, Clock, X, Info } from 'lucide-react'; 
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SubscriptionPlans } from './SubscriptionPlans';

const TRIAL_DAYS = 15;
const WARNING_THRESHOLD = 2; // Días 13 y 14

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyAccess, setEmergencyAccess] = useState(false); 
  const [showWarningModal, setShowWarningModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    checkTrialStatus();
  }, []);

  // --- ESTRATEGIA DE NOTIFICACIONES (TOAST) ---
  useEffect(() => {
      if (!loading && daysLeft !== null && daysLeft > 0 && !showWarningModal && !emergencyAccess) {
          const timer = setTimeout(() => {
              const isUrgent = daysLeft <= 5;
              
              toast.custom((t) => (
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-lg p-4 flex items-center gap-3 min-w-[300px] animate-in slide-in-from-bottom-5 duration-500">
                    <div className={`p-2 rounded-full ${isUrgent ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}`}>
                        {isUrgent ? <Clock size={18} /> : <Info size={18} />}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado de la cuenta</p>
                        <p className="text-sm font-medium text-slate-800">
                            {isUrgent 
                                ? `Atención: Quedan ${daysLeft} días de prueba` 
                                : `Prueba Profesional Activa (${daysLeft} días)`}
                        </p>
                    </div>
                </div>
              ), { duration: 5000 });
          }, 1500);
          
          return () => clearTimeout(timer);
      }
  }, [loading, daysLeft, emergencyAccess, showWarningModal]);

  const checkTrialStatus = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // 🛑 VALIDACIÓN DE SEGURIDAD: SI YA PAGÓ, NO MOLESTAR
            // Verifica que 'subscription_status' sea el nombre real de tu columna en Supabase
            const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_status') 
                .eq('id', user.id)
                .single();

            // Si es Premium o Activo, detenemos todo aquí.
            if (profile?.subscription_status === 'active' || profile?.subscription_status === 'premium') {
                setLoading(false);
                return; 
            }

            // SI NO ES PREMIUM, CALCULAMOS LOS DÍAS:
            if (user.created_at) {
                const startDate = new Date(user.created_at);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                const remaining = TRIAL_DAYS - diffDays; 
                setDaysLeft(remaining);

                // Días 13 y 14: Modal de advertencia
                if (remaining <= WARNING_THRESHOLD && remaining > 0) {
                    setShowWarningModal(true);
                }
            }
        }
    } catch (error) {
        console.error("Error verificando trial:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleEmergencyAccess = () => {
      if (confirm("⚠️ ¿Confirmar Acceso de Emergencia?\n\nSe habilitará el sistema temporalmente para cerrar consultas pendientes.")) {
          setEmergencyAccess(true);
      }
  };

  if (loading) return null;

  // 🔴 FASE 3: BLOQUEO TOTAL (Día 15+)
  if (daysLeft !== null && daysLeft <= 0 && !emergencyAccess) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-700 relative animate-in fade-in zoom-in-95 duration-300">
            
            <div className="bg-red-50 p-8 text-center border-b border-red-100">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-700 rounded-full font-bold text-xs uppercase tracking-wider mb-4">
                    <AlertTriangle size={14} /> Acceso Expirado
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Tu periodo de prueba ha finalizado</h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                    Para seguir utilizando la IA Clínica y acceder a tus expedientes, selecciona un plan profesional.
                </p>
            </div>

            <div className="p-6 bg-white">
                <SubscriptionPlans />
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-center">
                <button 
                    onClick={handleEmergencyAccess}
                    className="text-slate-400 hover:text-red-600 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                    <Unlock size={14} /> Habilitar Acceso de Emergencia (Uso limitado)
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 🟠 FASE 2: ZONA DE ADVERTENCIA (Días 13 y 14) - Modal Descartable
  if (showWarningModal && !emergencyAccess && daysLeft !== null && daysLeft > 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 ring-1 ring-slate-900/5">
            
            <button 
                onClick={() => setShowWarningModal(false)}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors z-50"
                title="Cerrar y continuar trabajando"
            >
                <X size={20} />
            </button>

            <div className="grid md:grid-cols-5 h-full">
                <div className="md:col-span-2 bg-slate-900 text-white p-8 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                    <Clock className="text-amber-400 mb-6" size={48} />
                    <h3 className="text-2xl font-bold mb-4">No pierdas tu ritmo</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        Tu prueba gratuita termina en <strong className="text-white">{daysLeft} días</strong>. 
                        Suscríbete ahora para evitar interrupciones en tu consulta médica.
                    </p>
                    <div className="text-xs text-slate-500 mt-auto">
                        Puedes cerrar esta ventana, pero volverá a aparecer mañana.
                    </div>
                </div>

                <div className="md:col-span-3 p-6 bg-slate-50 flex items-center">
                    <div className="w-full transform scale-95 origin-center">
                        <SubscriptionPlans />
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // 🟡 MODO EMERGENCIA (Banner fijo)
  if (emergencyAccess) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-2.5 flex justify-between items-center shadow-lg animate-in slide-in-from-top">
            <div className="flex items-center gap-3">
                <div className="p-1 bg-white/20 rounded animate-pulse"><AlertTriangle size={14} /></div>
                <p className="text-xs font-bold tracking-wide">MODO DE EMERGENCIA ACTIVO</p>
            </div>
            <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-1.5 bg-white text-red-600 text-[10px] font-black uppercase rounded shadow hover:bg-red-50 transition-transform hover:scale-105"
            >
                Suscribirme Ahora
            </button>
        </div>
      );
  }

  return null;
};