import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, Zap, RefreshCw, RotateCw, CheckCircle2 
} from 'lucide-react';
import { format } from 'date-fns';
import { GeminiMedicalService } from '../services/GeminiMedicalService'; 

interface DailyChallengeCardProps {
  specialty?: string;
}

const BACKUP_CHALLENGES = [
  { category: "Cardiología", question: "¿Fármaco de elección en HTA con Diabetes?", answer: "IECA / ARA-II" },
  { category: "Urgencias", question: "Triada de Cushing (HTIC)", answer: "HTA, Bradicardia, Alt. Resp." },
  { category: "Pediatría", question: "Dosis ponderal Paracetamol", answer: "10-15 mg/kg/dosis" },
  { category: "Medicina Interna", question: "Criterios de Framingham son para:", answer: "Insuficiencia Cardíaca" }
];

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ specialty = "Medicina General" }) => {
  const [challenge, setChallenge] = useState(BACKUP_CHALLENGES[0]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingChallenge, setLoadingChallenge] = useState(false);

  useEffect(() => {
    setIsFlipped(false); 
    loadDailyChallenge();
  }, [specialty]);

  const loadDailyChallenge = async () => {
    const todayKey = `daily_challenge_${format(new Date(), 'yyyy-MM-dd')}`;
    const storedData = localStorage.getItem('med_daily_challenge_data');
    const storedDate = localStorage.getItem('med_daily_challenge_date');

    if (storedDate === todayKey && storedData) {
      try {
        setChallenge(JSON.parse(storedData));
        return;
      } catch (e) {
        console.error("Error leyendo caché local, renovando...");
      }
    }

    setLoadingChallenge(true);
    try {
      const newChallenge = await GeminiMedicalService.getDailyChallenge(specialty);
      if (newChallenge) {
        setChallenge(newChallenge);
        localStorage.setItem('med_daily_challenge_data', JSON.stringify(newChallenge));
        localStorage.setItem('med_daily_challenge_date', todayKey);
      }
    } catch (error) {
      console.warn("Usando respaldo local");
      setChallenge(BACKUP_CHALLENGES[Math.floor(Math.random() * BACKUP_CHALLENGES.length)]);
    } finally {
      setLoadingChallenge(false);
    }
  };

  return (
    <div className="h-full min-h-[180px] w-full perspective-[1000px] group/card">
      <div 
        className="relative w-full h-full grid grid-cols-1 grid-rows-1 cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
        onClick={() => !loadingChallenge && setIsFlipped(!isFlipped)}
      >
          {/* CARA FRONTAL (Pregunta) - Diseño Degradado "Clinical AI" */}
          <div 
            className={`
                col-start-1 row-start-1 h-full
                [backface-visibility:hidden] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d]
                bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 shadow-xl shadow-indigo-200/50 dark:shadow-none flex flex-col justify-between
                ${isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'}
            `}
          >
            {/* Patrón de fondo sutil */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

            {loadingChallenge ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white">
                    <RefreshCw className="animate-spin" size={28}/>
                    <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Generando Reto...</span>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-start relative z-10">
                          <span className="bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10">
                              Reto Diario
                          </span>
                          <BrainCircuit size={20} className="text-white/60"/>
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-2 relative z-10">
                        <h3 className="font-bold text-lg leading-snug text-white drop-shadow-md line-clamp-4">
                            {challenge.question}
                        </h3>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10 relative z-10">
                        <span className="text-[9px] font-bold text-indigo-100/60 uppercase">
                            {challenge.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-300 animate-pulse">
                            Ver Respuesta <RotateCw size={10} className="ml-0.5"/>
                        </div>
                    </div>
                </>
            )}
          </div>

          {/* CARA TRASERA (Respuesta) */}
          <div 
            className={`
                col-start-1 row-start-1 h-full
                [backface-visibility:hidden] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d]
                bg-slate-900 border border-slate-700 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between
                ${isFlipped ? '[transform:rotateY(360deg)]' : '[transform:rotateY(180deg)]'}
            `}
          >
              <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center">
                  <div className="bg-emerald-500/20 p-2.5 rounded-full mb-2 ring-1 ring-emerald-500/30">
                      <CheckCircle2 size={24} className="text-emerald-400"/>
                  </div>
                  <h3 className="font-bold text-lg text-white leading-snug mb-1">
                      {challenge.answer}
                  </h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                      Respuesta Correcta
                  </p>
              </div>
              <div className="relative z-10 pt-3 border-t border-slate-800 text-center">
                  <p className="text-[9px] text-slate-500 uppercase flex items-center justify-center gap-2 cursor-pointer hover:text-white transition-colors">
                    <RotateCw size={10}/> Volver
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};