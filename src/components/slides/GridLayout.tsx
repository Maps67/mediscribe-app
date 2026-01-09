import React from 'react';
import { SlideData } from '../../types/presentation';
import { DynamicIcon } from '../ui/DynamicIcon';

export const GridLayout = ({ data }: { data: SlideData }) => (
  <div className="h-full flex flex-col justify-center">
    <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-sky-700 dark:text-sky-400 mb-4 md:mb-6">{data.title}</h2>
        <p className="text-base md:text-xl text-slate-600 dark:text-slate-300">{data.content}</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
      {data.items?.map((item, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 text-center hover:-translate-y-2 hover:shadow-xl transition-all duration-300 flex flex-col items-center">
          <div className="flex justify-center mb-4 md:mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-full">
            <DynamicIcon name={item.iconName} className="w-8 h-8 md:w-10 md:h-10 text-sky-500" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-3">{item.title}</h3>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{item.text}</p>
        </div>
      ))}
    </div>
  </div>
);