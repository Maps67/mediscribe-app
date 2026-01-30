import { useState } from 'react';

export const SubscriptionPlans = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const prices = {
    monthly: { id: 'price_monthly', amount: '1,199', label: '/mes' },
    yearly: { id: 'price_yearly', amount: '11,500', label: '/año' },
  };

  const handleSubscribe = (plan) => {
    const cycleText = plan === 'monthly' ? 'Mensual ($1,199 + IVA)' : 'Anual con descuento ($11,500 + IVA)';
    const message = `Hola, quiero activar mi *Consultorio Inteligente* con el plan ${cycleText}.`;
    window.open(`https://wa.me/5213347211199?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    // AJUSTE: Padding 'p-2' (0.5rem) para maximizar espacio en pantallas pequeñas
    <div className="w-full max-w-4xl mx-auto p-2 md:p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      
      {/* Header Hyper-Compacto */}
      <div className="text-center mb-2 md:mb-10">
        <h2 className="text-lg md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Tu Consultorio Inteligente
        </h2>
        <p className="text-slate-500 text-[10px] md:text-lg leading-tight mt-1">
          Suite clínica integral con IA.
        </p>
        
        {/* Toggle Compacto */}
        <div className="flex justify-center mt-2 md:mt-8">
          <div className="relative flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 scale-90 md:scale-100 origin-top">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`${
                billingCycle === 'monthly' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              } relative z-10 w-20 md:w-32 py-1 md:py-2 text-[10px] md:text-sm rounded-md transition-all duration-200`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`${
                billingCycle === 'yearly' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              } relative z-10 w-20 md:w-32 py-1 md:py-2 text-[10px] md:text-sm rounded-md transition-all duration-200`}
            >
              Anual
              <span className="absolute -top-2 -right-1 md:-right-4 px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] md:text-[10px] uppercase tracking-wide rounded-full font-bold border border-green-200 shadow-sm whitespace-nowrap">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 md:gap-8 items-start">
        
        {/* === PLAN PROFESIONAL (Principal) === */}
        {/* AJUSTE: Padding 'p-3' interno */}
        <div className="border-2 border-teal-500 rounded-xl p-3 md:p-8 relative bg-white shadow-lg ring-2 md:ring-4 ring-teal-50/50 z-10 isolate">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold uppercase tracking-wider shadow-md z-30 whitespace-nowrap">
            Recomendado
          </div>
          
          <div className="flex justify-between items-center md:block mt-1 md:mt-0">
             <h3 className="text-sm md:text-xl font-bold text-slate-900 relative z-20">Plan Profesional</h3>
             {/* Precio compacto en una línea para móvil */}
             <div className="flex md:hidden items-baseline relative z-30 bg-white">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">${billingCycle === 'monthly' ? '1.2k' : '11.5k'}</span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">+IVA</span>
             </div>
          </div>
          
          {/* Precio versión escritorio (Oculto en móvil para ahorrar espacio vertical si es necesario, o mantenemos el grande si cabe) */}
          {/* Para asegurar que quepa, usaremos una versión muy compacta en móvil arriba y ocultamos esta, O dejamos esta más pequeña */}
          <div className="hidden md:block mb-2 relative z-30 bg-white w-fit pr-4">
            <div className="flex items-baseline">
              <span className="text-5xl font-extrabold text-slate-900 tracking-tight">
                ${billingCycle === 'monthly' ? prices.monthly.amount : prices.yearly.amount}
              </span>
              <span className="text-slate-500 ml-2 font-medium text-base">MXN {billingCycle === 'monthly' ? '/ mes' : '/ año'}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1 ml-1 block">+ IVA</p>
          </div>

          {/* Ahorro Compacto */}
          <div className="h-auto min-h-[1rem] mb-2 md:mb-6 relative z-20">
            {billingCycle === 'yearly' ? (
              <p className="text-[9px] md:text-xs text-emerald-700 font-bold bg-emerald-50 inline-block px-1.5 py-0.5 rounded border border-emerald-100">
                Ahorras $2,900
              </p>
            ) : (
             <p className="text-[9px] md:text-xs text-slate-400">Facturación mensual.</p>
            )}
          </div>

          {/* Lista Ultra Compacta (text-[10px]) */}
          <ul className="space-y-1.5 md:space-y-4 mb-3 md:mb-8 relative z-20">
            <li className="flex items-start text-[10px] md:text-sm text-slate-700 font-medium">
              <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-teal-500 mr-1.5 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Asistente IA Híbrido Completo
            </li>
            <li className="flex items-start text-[10px] md:text-sm text-slate-700 font-medium">
              <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-teal-500 mr-1.5 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Calculadoras de Riesgo Qx
            </li>
            <li className="flex items-start text-[10px] md:text-sm text-slate-700 font-medium">
              <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-teal-500 mr-1.5 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Notas y Expediente Ilimitado
            </li>
          </ul>

          <button
            onClick={() => handleSubscribe(billingCycle)}
            className="w-full py-2 md:py-3.5 px-4 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-lg md:rounded-xl transition-all shadow-md transform active:scale-95 flex items-center justify-center gap-2 relative z-20 text-xs md:text-base"
          >
            Comenzar Ahora
            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>

        {/* === PLAN CLÍNICAS (Minimizado en Móvil) === */}
        <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 md:p-8 relative mt-0 z-0 flex md:block justify-between items-center">
            <div>
                <div className="md:absolute md:top-0 md:right-0 md:bg-slate-200 md:text-slate-500 text-slate-400 md:text-[10px] font-bold md:px-3 md:py-1 md:rounded-bl-xl md:rounded-tr-xl tracking-wide uppercase text-[9px] mb-1 md:mb-0">
                    Próximamente
                </div>
                <h3 className="text-xs md:text-lg font-bold text-slate-400">Clínicas & Hospitales</h3>
                {/* Ocultamos descripción en móvil para ahorrar espacio */}
                <p className="hidden md:block text-sm text-slate-400 mb-6">Control centralizado para equipos.</p>
                {/* Ocultamos lista en móvil */}
                <ul className="hidden md:block space-y-4 mb-10 opacity-50 grayscale">
                    <li className="flex items-center text-sm text-slate-400">Multi-usuario y Roles</li>
                    <li className="flex items-center text-sm text-slate-400">Panel Administrativo</li>
                </ul>
            </div>
            
            {/* Botón Pequeño en Móvil */}
            <button disabled className="py-1.5 px-3 md:py-3 md:px-4 border border-slate-200 bg-slate-100 text-slate-400 font-bold rounded-lg cursor-not-allowed text-[10px] md:text-base whitespace-nowrap ml-4 md:ml-0 md:w-full">
                Lista de Espera
            </button>
        </div>
      </div>
      
      <p className="text-center text-[9px] md:text-xs text-slate-400 mt-2 md:mt-8 mx-auto max-w-lg">
        Cancela cuando quieras.
      </p>
    </div>
  );
};