import React from 'react';
import { ShieldAlert, ArrowLeft, FileCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
        
        <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
            <ShieldAlert size={32} className="text-yellow-400" />
            <div>
                <h1 className="text-2xl font-bold">Aviso Legal y Términos de Uso</h1>
                <p className="text-slate-300 text-sm">MediScribe AI - Software de Gestión Clínica</p>
            </div>
        </div>

        <div className="p-8 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
            
            <section>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileCheck size={20} className="text-brand-teal"/> 1. Naturaleza del Servicio (EHR)
                </h2>
                <p>
                    <strong>MediScribe AI</strong> se clasifica exclusivamente como un <strong>Software de Gestión de Expediente Clínico Electrónico (EHR)</strong> y herramienta de productividad administrativa.
                    <br/><br/>
                    Este software <strong>NO es un dispositivo médico</strong>, no realiza diagnósticos automatizados y bajo ninguna circunstancia sustituye el juicio clínico, la anamnesis directa o la exploración física realizada por el profesional de la salud.
                </p>
            </section>

            <section className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800/50">
                <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-400 mb-3 flex items-center gap-2">
                    2. Limitación de Responsabilidad (IA)
                </h2>
                <ul className="space-y-3 list-disc pl-5 marker:text-yellow-500">
                    <li>
                        <strong>Sugerencias Administrativas:</strong> El contenido generado por la Inteligencia Artificial (transcripciones, resúmenes, recetas) se proporciona únicamente como un <strong>borrador sugerido</strong> para agilizar la documentación.
                    </li>
                    <li>
                        <strong>Responsabilidad del Profesional:</strong> El Médico tratante reconoce y acepta que es su <strong>responsabilidad exclusiva e intransferible</strong> revisar, corregir, validar y aprobar cualquier texto, dosis, frecuencia o indicación antes de guardarla en el expediente o entregarla al paciente.
                    </li>
                    <li>
                        <strong>Exención:</strong> MediScribe AI no se hace responsable por errores de interpretación, alucinaciones de la IA u omisiones en el texto generado. El uso de esta herramienta es bajo el propio riesgo profesional del usuario.
                    </li>
                </ul>
            </section>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                <NavLink to="/" className="flex items-center gap-2 px-6 py-3 bg-brand-teal text-white rounded-xl font-bold hover:bg-teal-600 transition-colors shadow-lg">
                    <ArrowLeft size={20} /> Volver al Dashboard
                </NavLink>
            </div>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;