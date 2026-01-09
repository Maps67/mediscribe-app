import React from 'react';
import { SlideData } from '../../types/presentation';
import { SafeImage } from '../ui/SafeImage';
import { DynamicIcon } from '../ui/DynamicIcon';

export const SplitLayout = ({ data }: { data: SlideData }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center h-full">
        <div className="order-2 md:order-1">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-sky-700 dark:text-sky-400 mb-6 md:mb-10 w-full leading-tight">
                {data.title}
            </h2>
            
            {/* Si el contenido es una lista (Array), lo pintamos con bullets */}
            {Array.isArray(data.content) ? (
                <ul className="space-y-4">
                    {data.content.map((line, i) => (
                        <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-300 text-sm md:text-base">
                             <DynamicIcon name="Check" className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                             <span>{line}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    {data.content}
                </p>
            )}
        </div>
        
        <div className="order-1 md:order-2 rounded-3xl overflow-hidden shadow-lg h-[250px] md:h-[400px] bg-slate-200 relative border-4 border-white dark:border-slate-800">
            {data.image && (
                <SafeImage 
                    src={data.image} 
                    alt={data.title || ''} 
                    className="w-full h-full object-cover" 
                />
            )}
        </div>
    </div>
);