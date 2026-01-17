import React, { useEffect, useState } from 'react';
import { HealthService, SystemHealth } from '../../services/HealthService';

export const HealthStatusBadge: React.FC = () => {
  // 1. ESTADO (La memoria del componente)
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // 2. LÓGICA (El cerebro que ejecuta el check)
  const runCheck = async () => {
    // No ponemos loading=true aquí para evitar parpadeos en actualizaciones silenciosas
    const result = await HealthService.runFullDiagnosis();
    setHealth(result);
    setLoading(false);
  };

  useEffect(() => {
    // Primer chequeo al montar
    runCheck();

    // Intervalo de 5 minutos (300,000 ms)
    const interval = setInterval(runCheck, 300000);
    return () => clearInterval(interval);
  }, []);

  // Helper para colores del LED
  const getStatusColor = (status: SystemHealth['overall']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
      case 'degraded': return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
      case 'critical': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      default: return 'bg-gray-400';
    }
  };

  // 3. RENDERIZADO (Si está cargando por primera vez)
  if (loading && !health) return <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />;

  // 4. VISUAL FINAL (El diseño "Limpio" corregido)
  return (
    <div 
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full 
                 bg-white dark:bg-slate-800 
                 border border-slate-200 dark:border-slate-700 
                 shadow-sm hover:shadow-md transition-all duration-300 cursor-help group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* LED Indicator */}
      <div className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${getStatusColor(health?.overall || 'healthy')}`} />
      
      {/* Texto: Oscuro en día, Claro en noche */}
      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
        System {health?.overall === 'healthy' ? 'OK' : 'Alert'}
      </span>

      {/* Tooltip Detallado (Manteniendo contraste oscuro para lectura técnica) */}
      {showTooltip && health && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-800 text-white border border-slate-700 rounded-lg shadow-xl text-xs z-50 backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Database</span>
              <span className={health.database.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                {health.database.latency}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">AI Core</span>
              <span className={health.ai.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                {health.ai.latency}ms
              </span>
            </div>
            <div className="h-px bg-slate-700 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Microphone</span>
              <span className={health.client.mic ? 'text-green-400' : 'text-yellow-500'}>
                {health.client.mic ? 'Ready' : 'Check Perms'}
              </span>
            </div>
          </div>
          {/* Flecha del tooltip centrada */}
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-slate-700 transform rotate-45" />
        </div>
      )}
    </div>
  );
};