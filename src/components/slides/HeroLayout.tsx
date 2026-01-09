import React from 'react';
import { SlideData } from '../../types/presentation';

export const HeroLayout = ({ data }: { data: SlideData }) => (
  <div className="text-center max-w-4xl mx-auto pt-8 md:pt-0 h-full flex flex-col justify-center">
    <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
      {data.subtitle}<br/>
      <span className={`text-transparent bg-clip-text bg-gradient-to-r ${data.meta?.gradient || 'from-sky-500 to-indigo-600'}`}>
        {data.title}
      </span>
    </h1>
    <p className="text-base sm:text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-light mb-12 max-w-3xl mx-auto leading-relaxed">
      {data.content}
    </p>
  </div>
);