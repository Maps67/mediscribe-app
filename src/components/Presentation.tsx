import React from 'react';
import { presentationData } from '../data/presentationData';
import { SlideData } from '../types/presentation';

// Importamos los diseños existentes (Respetando estructura original)
import { HeroLayout } from './slides/HeroLayout';
import { SplitLayout } from './slides/SplitLayout';
import { GridLayout } from './slides/GridLayout';

// --- COMPONENTE ENVOLTORIO (El "Marco" común) ---
// Actualizado a v5.4 con identidad de "Blindaje"
const SlideWrapper = ({ children, id }: { children: React.ReactNode; id: string }) => (
  <div id={id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl relative overflow-hidden min-h-[600px] md:min-h-[720px] w-full max-w-[1280px] mx-auto flex flex-col p-6 md:p-20 mb-20 scroll-mt-24 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
    
    {/* 1. Decoraciones de Fondo (Gradientes Clínicos - Ajustados para transmitir serenidad/seguridad) */}
    <div className="absolute top-0 right-0 w-[150px] md:w-[300px] h-[150px] md:h-[300px] bg-sky-500/10 rounded-bl-full -z-0 pointer-events-none blur-3xl" />
    <div className="absolute bottom-0 left-0 w-[150px] md:w-[250px] h-[150px] md:h-[250px] bg-teal-500/10 rounded-tr-full -z-0 pointer-events-none blur-3xl" />
    
    {/* 2. Header Constante (LOGO & ESTATUS) */}
    <div className="absolute top-4 right-4 md:top-10 md:right-16 flex items-center gap-3 z-10">
      <img 
        src="/img/logo.png" 
        alt="VitalScribe Logo" 
        className="h-8 md:h-16 w-auto object-contain opacity-80"
        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
      />
      <div className="hidden md:flex flex-col items-end">
        <span className="font-bold text-slate-300 text-sm tracking-widest uppercase font-sans">
          VitalScribe AI
        </span>
        {/* Nuevo indicador de protocolo activo */}
        <span className="text-[10px] text-teal-500 font-mono bg-teal-500/10 px-2 py-0.5 rounded-full mt-1">
          ● PROTOCOLO ACTIVO
        </span>
      </div>
    </div>

    {/* 3. Área de Contenido Dinámico */}
    <div className="flex-1 flex flex-col justify-center relative z-10 w-full mt-8 md:mt-0">
      {children}
    </div>

    {/* 4. Footer Constante (Actualizado a v5.4) */}
    <div className="absolute bottom-4 md:bottom-6 left-0 w-full text-center text-[8px] md:text-[10px] text-slate-400 z-10 px-4 font-mono">
      VitalScribe AI v5.4 | Protocolo Omni-Sentinel & RLS. © 2026.
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
const Presentation = () => {
  
  // Renderizado condicional basado en el Manifiesto
  const renderSlideContent = (slide: SlideData) => {
    switch (slide.type) {
      case 'hero':
        return <HeroLayout data={slide} />;
      case 'split':
        return <SplitLayout data={slide} />;
      case 'grid':
        return <GridLayout data={slide} />;
      default:
        return <div className="text-red-500">Error: Diseño no reconocido ({slide.type})</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 md:py-12 px-2 md:px-8 font-sans transition-colors duration-300">
      {/* Mapeamos los datos actualizados del Manifiesto */}
      {presentationData.map((slide) => (
        <SlideWrapper key={slide.id} id={slide.id}>
          {renderSlideContent(slide)}
        </SlideWrapper>
      ))}
    </div>
  );
};

export default Presentation;