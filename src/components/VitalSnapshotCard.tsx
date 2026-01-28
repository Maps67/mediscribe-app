import React from 'react';
import { AlertTriangle, CheckSquare, Activity, ClipboardList, BookOpen } from 'lucide-react';
// Eliminamos la importación estricta para permitir flexibilidad en el JSON
// import { PatientInsight } from '../types'; 

interface VitalSnapshotProps {
  insight: any; // Cambiado a any temporalmente para permitir el mapeo de campos legacy
  isLoading: boolean;
}

export const VitalSnapshotCard: React.FC<VitalSnapshotProps> = ({ insight, isLoading }) => {
  // 1. Estado de Carga (Skeleton UI)
  if (isLoading) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md shadow-sm animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 bg-amber-200 rounded-full"></div>
          <div className="h-4 bg-amber-200 rounded w-1/3"></div>
        </div>
        <div className="mt-4 h-16 bg-amber-100 rounded"></div>
      </div>
    );
  }

  if (!insight) return null;

  // --- MOTOR DE NORMALIZACIÓN (ADAPTADOR DE ESQUEMA) ---
  // Detectamos qué formato de datos trae la BD y lo unificamos.
  
  // 1. Recuperación del Texto Principal (Evolución o Antecedentes)
  // Prioridad: evolution (nuevo) -> background (legacy) -> history_summary -> Texto genérico
  const displayEvolution = 
    insight.evolution || 
    insight.background || 
    insight.history_summary || 
    "Sin resumen clínico disponible.";

  // 2. Recuperación de Riesgos
  // Si no hay risk_flags pero hay 'allergies', las mostramos como alerta
  let safeRisks: string[] = [];
  if (Array.isArray(insight.risk_flags)) {
    safeRisks = insight.risk_flags;
  } else if (insight.allergies && insight.allergies.length > 2) {
    // Fallback: Mostrar alergias como riesgos si es formato antiguo
    safeRisks = [`Alergias: ${insight.allergies}`];
  }

  // 3. Recuperación de Acciones
  const safeActions = Array.isArray(insight.pending_actions) ? insight.pending_actions : [];

  // 4. Auditoría Farmacológica (o Estilo de Vida en legacy)
  const displayAudit = 
    insight.medication_audit || 
    (insight.lifestyle ? `Estilo de vida: ${insight.lifestyle}` : "Sin auditoría disponible.");

  // Determinar severidad visual
  const hasRisks = safeRisks.length > 0;
  const containerClass = hasRisks 
    ? "bg-amber-50 border-amber-500" 
    : "bg-blue-50 border-blue-500";

  return (
    <div className={`border-l-4 rounded-r-md shadow-sm p-4 mb-6 ${containerClass}`}>
      
      {/* HEADER: EL GANCHO (Contexto Inmediato) */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Vital Snapshot (Contexto Unificado)
          </h3>
          <p className="mt-1 text-lg font-semibold text-gray-800 leading-snug">
            {displayEvolution}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200/50 pt-3">
        
        {/* COLUMNA 1: RIESGOS Y AUDITORÍA */}
        <div className="space-y-3">
          {hasRisks ? (
            <div className="bg-red-50 p-2 rounded border border-red-100">
              <h4 className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3" /> BANDERAS ROJAS
              </h4>
              <ul className="list-disc list-inside text-sm text-red-800">
                {safeRisks.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          ) : (
             /* Si no hay riesgos, mostramos info familiar (Legacy fallback) */
             insight.family && (
                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
                        <BookOpen className="w-3 h-3" /> ANTECEDENTES FAMILIARES
                    </h4>
                    <p className="text-xs text-gray-600">{insight.family}</p>
                </div>
             )
          )}
          
          <div>
            <h4 className="text-xs font-bold text-gray-500 mb-1">
                {insight.medication_audit ? "AUDITORÍA FARMACOLÓGICA" : "FACTORES ASOCIADOS"}
            </h4>
            <p className="text-sm text-gray-700 italic">
              "{displayAudit}"
            </p>
          </div>
        </div>

        {/* COLUMNA 2: ACCIONES PENDIENTES (CHECKLIST) */}
        <div>
          <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-2">
            <ClipboardList className="w-3 h-3" /> PLAN / PENDIENTES
          </h4>
          {safeActions.length > 0 ? (
            <ul className="space-y-2">
              {safeActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-1 rounded">
                  <CheckSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-2">
                 <span className="text-xs text-green-600 font-medium">✅ Sin pendientes críticos</span>
                 {/* Fallback para mostrar OBGYN si no hay acciones (Legacy) */}
                 {insight.obgyn && (
                     <div className="mt-2 text-xs text-gray-500 border-t border-dashed pt-2">
                         <strong>Gineco-Obstetricia:</strong> {insight.obgyn}
                     </div>
                 )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};