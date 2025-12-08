import React, { useState } from 'react';
import { Lightbulb, CheckCircle2, RefreshCw, ChevronRight, BrainCircuit } from 'lucide-react';

interface CaseStudy {
  id: number;
  category: string;
  title: string;
  vignette: string;
  vitals: string;
  question: string;
  answer: string;
  pearl: string;
  evidenceLevel: string;
}

const CASES: CaseStudy[] = [
  {
    id: 1,
    category: 'CARDIOLOGÍA',
    title: 'Dolor Torácico en Urgencias',
    vignette: 'Masc. 55 años, diabético. Dolor epigástrico urente de 2h evolución. ECG: Elevación ST en V1-V4.',
    vitals: 'TA: 150/90 | FC: 98 | SatO2: 94%',
    question: '¿Cuál es el diagnóstico más probable y la arteria afectada?',
    answer: 'IAMCEST Anterior (Infarto Anteroseptal).',
    pearl: 'La arteria descendente anterior (DA) es la culpable en el 90% de los infartos anteriores. Requiere reperfusión inmediata.',
    evidenceLevel: 'Guías ESC 2023'
  },
  {
    id: 2,
    category: 'ENDOCRINOLOGÍA',
    title: 'Estado Hiperosmolar vs Cetoacidosis',
    vignette: 'Fem. 72 años, letargo. Glucosa 850 mg/dL, pH 7.35, HCO3 22, Cetonas (-).',
    vitals: 'TA: 90/60 | FC: 110 | Mucosas secas +++',
    question: '¿Diagnóstico y primera línea de tratamiento?',
    answer: 'Estado Hiperosmolar Hiperglucémico (EHH). Hidratación agresiva.',
    pearl: 'En EHH el déficit de agua es de 8-10L. La insulina se inicia SOLO después de asegurar hidratación y K+ > 3.3.',
    evidenceLevel: 'ADA Standards 2024'
  },
  {
    id: 3,
    category: 'NEUMOLOGÍA',
    title: 'Disnea Súbita Post-Quirúrgica',
    vignette: 'Fem. 30 años, 3 días post-cesárea. Disnea súbita y dolor pleurítico. Pulmones claros.',
    vitals: 'TA: 100/60 | FC: 125 | SatO2: 88% AA',
    question: '¿Estudio Gold Standard para confirmar diagnóstico?',
    answer: 'AngioTAC Pulmonar (Sospecha de TEP).',
    pearl: 'La hipoxia con radiografía de tórax normal es altamente sugestiva de TEP. El Dímero-D tiene bajo valor predictivo positivo en puerperio.',
    evidenceLevel: 'Guías ATS/STR'
  }
];

export const InteractiveClinicalCase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeCase = CASES[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % CASES.length);
    }, 300);
  };

  return (
    <div className="perspective-1000 w-full h-[320px] group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* CARA FRONTAL (PREGUNTA) */}
        <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between border border-slate-700/50">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/30 tracking-wider">
                {activeCase.category}
              </span>
              <BrainCircuit className="text-slate-600 group-hover:text-indigo-400 transition-colors" size={24} />
            </div>
            
            <h3 className="text-xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              {activeCase.title}
            </h3>
            
            <div className="space-y-3">
              <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-indigo-500 pl-3">
                {activeCase.vignette}
              </p>
              <div className="bg-slate-900/50 p-2 rounded-lg inline-block">
                <p className="text-xs font-mono text-emerald-400">{activeCase.vitals}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-indigo-200 text-sm font-bold flex items-center gap-2 animate-pulse">
              <Lightbulb size={16} /> {activeCase.question}
            </p>
            <p className="text-center text-xs text-slate-500 mt-4 opacity-50">Toca para revelar respuesta</p>
          </div>
        </div>

        {/* CARA TRASERA (RESPUESTA) */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-3xl p-6 shadow-xl flex flex-col justify-between border border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-4 text-emerald-600">
              <CheckCircle2 size={20} />
              <span className="font-bold text-xs uppercase tracking-wide">Respuesta Correcta</span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {activeCase.answer}
            </h3>
            
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-3">
              <p className="text-slate-700 text-xs leading-relaxed">
                <span className="font-bold text-indigo-700">Perla Clínica:</span> {activeCase.pearl}
              </p>
            </div>
            
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {activeCase.evidenceLevel}
            </span>
          </div>

          <button 
            onClick={handleNext}
            className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Siguiente Reto <ChevronRight size={16} />
          </button>
        </div>

      </div>
      
      {/* Estilos CSS Inline para soportar 3D sin plugins extra de Tailwind si no están configurados */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};