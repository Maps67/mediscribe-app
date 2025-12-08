import React, { useState, useEffect } from 'react';
import { Calculator, Activity, Baby, ArrowRight, RotateCcw } from 'lucide-react';

type CalcType = 'BMI' | 'GFR' | 'PEDS';

export const MedicalCalculators = () => {
  const [activeTab, setActiveTab] = useState<CalcType>('GFR');
  const [result, setResult] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);

  // Estados para inputs
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M'|'F'>('M');

  const calculate = () => {
    let val = 0;
    
    if (activeTab === 'BMI') {
      const w = parseFloat(weight);
      const h = parseFloat(height); // asumiendo cm
      if (w && h) {
        val = w / ((h/100) * (h/100));
        setResult(val.toFixed(1));
        if (val < 18.5) setInterpretation('Bajo Peso');
        else if (val < 25) setInterpretation('Normal');
        else if (val < 30) setInterpretation('Sobrepeso');
        else setInterpretation('Obesidad');
      }
    } 
    else if (activeTab === 'GFR') {
      // CKD-EPI 2021 Formula
      const scr = parseFloat(creatinine);
      const a = parseFloat(age);
      if (scr && a) {
        const k = gender === 'F' ? 0.7 : 0.9;
        const alpha = gender === 'F' ? -0.241 : -0.302;
        const min_val = Math.min(scr / k, 1);
        const max_val = Math.max(scr / k, 1);
        
        // eGFR = 142 * min^alpha * max^-1.2 * 0.9938^Age * 1.012(if F)
        val = 142 * Math.pow(min_val, alpha) * Math.pow(max_val, -1.200) * Math.pow(0.9938, a);
        if (gender === 'F') val *= 1.012;

        setResult(val.toFixed(0));
        if (val >= 90) setInterpretation('Estadio G1 (Normal)');
        else if (val >= 60) setInterpretation('Estadio G2 (Leve)');
        else if (val >= 45) setInterpretation('Estadio G3a (Mod-Grave)');
        else if (val >= 30) setInterpretation('Estadio G3b (Mod-Grave)');
        else if (val >= 15) setInterpretation('Estadio G4 (Grave)');
        else setInterpretation('Estadio G5 (Falla Renal)');
      }
    }
    else if (activeTab === 'PEDS') {
      const w = parseFloat(weight);
      if (w) {
        // Dosis ejemplo paracetamol 15mg/kg
        val = w * 15;
        setResult(`${val} mg`);
        setInterpretation('Dosis Paracetamol (15mg/kg)');
      }
    }
  };

  const reset = () => {
    setResult(null);
    setInterpretation(null);
    setWeight(''); setHeight(''); setCreatinine(''); setAge('');
  };

  useEffect(() => reset(), [activeTab]);

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden h-[320px] flex flex-col">
      <div className="bg-slate-50 border-b border-slate-100 p-2 flex gap-1">
        {[
          { id: 'GFR', label: 'TFG (CKD-EPI)', icon: Activity },
          { id: 'BMI', label: 'IMC', icon: Calculator },
          { id: 'PEDS', label: 'Dosis Ped', icon: Baby },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CalcType)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
              activeTab === tab.id 
              ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5 flex-1 flex flex-col relative">
        {activeTab === 'GFR' && (
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2 flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setGender('M')} className={`flex-1 rounded-md text-xs py-1.5 font-bold transition-all ${gender === 'M' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>HOMBRE</button>
                <button onClick={() => setGender('F')} className={`flex-1 rounded-md text-xs py-1.5 font-bold transition-all ${gender === 'F' ? 'bg-white shadow text-pink-600' : 'text-slate-400'}`}>MUJER</button>
             </div>
             <input type="number" placeholder="Creatinina (mg/dL)" className="input-calc" value={creatinine} onChange={e => setCreatinine(e.target.value)} />
             <input type="number" placeholder="Edad (años)" className="input-calc" value={age} onChange={e => setAge(e.target.value)} />
          </div>
        )}

        {activeTab === 'BMI' && (
           <div className="grid grid-cols-2 gap-3">
             <input type="number" placeholder="Peso (kg)" className="input-calc" value={weight} onChange={e => setWeight(e.target.value)} />
             <input type="number" placeholder="Altura (cm)" className="input-calc" value={height} onChange={e => setHeight(e.target.value)} />
           </div>
        )}

        {activeTab === 'PEDS' && (
           <div className="grid grid-cols-1 gap-3">
             <input type="number" placeholder="Peso Paciente (kg)" className="input-calc" value={weight} onChange={e => setWeight(e.target.value)} />
             <p className="text-xs text-slate-400 text-center mt-2">Calcula dosis estándar (15mg/kg)</p>
           </div>
        )}

        {/* RESULTADO OVERLAY */}
        {result ? (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <span className="text-xs font-bold text-slate-400 uppercase mb-1">Resultado Calculado</span>
             <div className="text-4xl font-black text-slate-900 mb-1">{result} <span className="text-sm font-medium text-slate-400">{activeTab === 'GFR' ? 'ml/min' : activeTab === 'BMI' ? 'kg/m²' : ''}</span></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold mb-4 ${
               activeTab === 'GFR' && parseFloat(result) < 60 ? 'bg-red-100 text-red-700' : 'bg-teal-50 text-teal-700'
             }`}>
               {interpretation}
             </div>
             <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs">
               <RotateCcw size={14}/> Calcular Otro
             </button>
          </div>
        ) : (
          <button onClick={calculate} className="mt-auto w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex justify-center items-center gap-2">
            Calcular <ArrowRight size={16}/>
          </button>
        )}
      </div>
      
      <style>{`
        .input-calc { @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 transition-all; }
      `}</style>
    </div>
  );
};