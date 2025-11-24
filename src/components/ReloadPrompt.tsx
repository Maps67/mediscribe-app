import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Solo mostramos si hay actualización (needRefresh) o si está listo offline
  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 animate-fade-in-up max-w-sm w-full p-4">
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-3">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                    {needRefresh ? '¡Actualización Disponible!' : 'Modo Offline Listo'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                    {needRefresh 
                        ? 'Hay una nueva versión de MediScribe con mejoras.' 
                        : 'La app está lista para usarse sin internet.'}
                </p>
            </div>
            <button onClick={close} className="text-slate-400 hover:text-white">
                <X size={18} />
            </button>
        </div>

        {needRefresh && (
            <button 
                onClick={() => updateServiceWorker(true)}
                className="bg-brand-teal hover:bg-teal-600 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
                <RefreshCw size={16} /> Actualizar Ahora
            </button>
        )}
      </div>
    </div>
  );
};

export default ReloadPrompt;