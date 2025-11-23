import React, { useEffect, useState } from 'react';
import { TrendingUp, UserMinus, Send, AlertCircle } from 'lucide-react';
import { AnalyticsService, InactivePatient, DiagnosisTrend } from '../services/AnalyticsService';

const InsightsPanel: React.FC = () => {
  const [inactivePatients, setInactivePatients] = useState<InactivePatient[]>([]);
  const [trends, setTrends] = useState<DiagnosisTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const [inactive, trendData] = await Promise.all([
        AnalyticsService.getInactivePatients(6), // 6 meses de inactividad
        AnalyticsService.getDiagnosisTrends()
      ]);
      setInactivePatients(inactive);
      setTrends(trendData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = (patient: InactivePatient) => {
    if (!patient.phone) return alert("El paciente no tiene teléfono registrado.");
    
    const message = `Hola ${patient.name}, notamos que hace tiempo no vienes a consulta. En MediScribe nos preocupamos por tu salud. ¿Te gustaría agendar una revisión general?`;
    const url = `https://wa.me/${patient.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="h-40 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse mb-8"></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in-up delay-100">
      
      {/* TARJETA 1: OPORTUNIDADES DE REACTIVACIÓN */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserMinus className="text-orange-500" size={20}/>
                Oportunidad de Reactivación
            </h3>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                {inactivePatients.length} Detectados
            </span>
        </div>
        
        {inactivePatients.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">¡Excelente! Tus pacientes son recurrentes.</p>
        ) : (
            <div className="space-y-3">
                {inactivePatients.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{p.name}</p>
                            <p className="text-xs text-slate-400">Ausente hace {p.daysSince} días</p>
                        </div>
                        <button 
                            onClick={() => handleReactivate(p)}
                            className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                            title="Enviar mensaje de reactivación"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                ))}
            </div>
        )}
        <p className="text-[10px] text-slate-400 mt-4 text-center">Pacientes sin visita en +6 meses.</p>
      </div>

      {/* TARJETA 2: TENDENCIAS CLÍNICAS */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="text-indigo-500" size={20}/>
                Tendencias del Mes
            </h3>
            <span className="text-xs text-slate-400">Análisis IA</span>
        </div>

        {trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                <AlertCircle size={24} className="mb-2 opacity-50"/>
                <p>Insuficientes datos para analizar.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {trends.map((t, i) => (
                    <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-300 font-medium">{t.topic}</span>
                            <span className="text-indigo-500 font-bold">{t.count} casos</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${Math.min(t.percentage * 2, 100)}%` }} // Multiplicador visual
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        )}
        <p className="text-[10px] text-slate-400 mt-6 text-center">Basado en palabras clave de tus notas recientes.</p>
      </div>

    </div>
  );
};

export default InsightsPanel;