import React from 'react';
import { X, LayoutDashboard, UserPlus, BrainCircuit, FileText, ShieldCheck, ArrowDown, BookOpen } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProtocol?: () => void; // ✅ NUEVO: Acción para abrir tu presentación v9.3
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, onOpenProtocol }) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <LayoutDashboard size={24} className="text-white" />,
      color: "bg-slate-700",
      title: "1. Dashboard (Tablero)",
      desc: "Su centro de comando: Gestione Agenda, Base de Pacientes y Configuración desde un solo lugar."
    },
    {
      icon: <UserPlus size={24} className="text-white" />,
      color: "bg-blue-600",
      title: "2. Registro Normativo (NOM-004)",
      desc: "Alta obligatoria. Ingrese la ficha de identificación completa antes de iniciar para garantizar validez legal."
    },
    {
      icon: <BrainCircuit size={24} className="text-white" />,
      color: "bg-purple-600",
      title: "3. Consulta IA y Consentimiento",
      desc: "Seleccione paciente y obtenga consentimiento verbal. La IA transcribe y estructura el SOAP detectando riesgos."
    },
    {
      icon: <FileText size={24} className="text-white" />, // Icono seguro
      color: "bg-amber-500",
      title: "4. Plan y Receta",
      desc: "Genere el Plan Terapéutico. El sistema audita interacciones (Escudo Farmacológico). Imprima el formato oficial."
    },
    {
      icon: <ShieldCheck size={24} className="text-white" />,
      color: "bg-emerald-600",
      title: "5. Revisión y Blindaje",
      desc: "Revise el borrador preliminar. Al dar clic en 'Validar', la nota se cifra (AES-256) y se blinda legalmente."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative animate-in slide-in-from-bottom-4">
        
        {/* Encabezado */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Flujo Clínico Blindado</h2>
            <p className="text-slate-500 text-sm font-medium">Estándar operativo v9.3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="relative">
            {/* Línea conectora */}
            <div className="absolute left-6 top-4 bottom-4 w-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>

            <div className="space-y-8 relative">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 relative group">
                  
                  {/* Icono */}
                  <div className={`relative z-10 w-12 h-12 rounded-2xl ${step.color} shadow-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                    {step.icon}
                    {idx !== steps.length - 1 && (
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-slate-900 p-1 rounded-full text-slate-300 dark:text-slate-600">
                        <ArrowDown size={18} />
                      </div>
                    )}
                  </div>

                  {/* Texto */}
                  <div className="pt-1 pb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{step.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed text-justify">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- AQUÍ INTEGRAMOS EL PROTOCOLO --- */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center shrink-0 flex flex-col gap-3">
          
          <button 
            onClick={onClose}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-200 dark:shadow-none"
          >
            Entendido, Iniciar Consulta
          </button>

          {/* Botón secundario para los "Curiosos/Exigentes" */}
          <button 
            onClick={onOpenProtocol}
            className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors mx-auto group py-2"
          >
            <BookOpen size={14} className="group-hover:scale-110 transition-transform" />
            <span>
              Ver detalles técnicos: <span className="underline decoration-dotted group-hover:text-brand-700">Protocolo Omni-Sentinel v9.3</span>
            </span>
          </button>

        </div>

      </div>
    </div>
  );
};