import React from 'react';
// Si no tienes lucide-react, ejecuta: npm install lucide-react
import { ShieldCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface RiskBadgeProps {
  // Usamos exactamente los tipos definidos en tu sistema
  level?: 'Bajo' | 'Medio' | 'Alto'; 
  reason?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, reason }) => {
  // Si Gemini no devolvió nivel, no mostramos nada para no ensuciar la interfaz
  if (!level) return null;

  // Configuración visual según el nivel de riesgo
  const getBadgeConfig = () => {
    switch (level) {
      case 'Alto':
        return {
          style: 'bg-red-100 text-red-700 border-red-200',
          icon: <AlertCircle className="w-5 h-5 mr-2" />,
          title: 'RIESGO ALTO',
          descriptionStyle: 'text-red-600'
        };
      case 'Medio':
        return {
          style: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: <AlertTriangle className="w-5 h-5 mr-2" />,
          title: 'RIESGO MODERADO',
          descriptionStyle: 'text-amber-600'
        };
      case 'Bajo':
      default:
        return {
          style: 'bg-green-100 text-green-700 border-green-200',
          icon: <ShieldCheck className="w-5 h-5 mr-2" />,
          title: 'RIESGO BAJO',
          descriptionStyle: 'text-green-600'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className={`border rounded-lg p-4 mb-4 ${config.style} transition-all duration-300`}>
      <div className="flex items-center mb-1">
        {config.icon}
        <span className="font-bold tracking-wide">{config.title}</span>
      </div>
      
      {reason && (
        <div className={`text-sm ml-7 flex items-start ${config.descriptionStyle}`}>
          <Info className="w-3 h-3 mt-1 mr-1 flex-shrink-0 opacity-70" />
          <span>{reason}</span>
        </div>
      )}
    </div>
  );
};