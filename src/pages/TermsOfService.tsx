// Archivo: src/pages/TermsOfService.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Scale, FileText, Download, CheckCircle, 
  AlertTriangle, Lock, Server, FileJson, ChevronLeft
} from 'lucide-react';

const TermsOfService = () => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'terms'>('dossier');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans animate-fade-in">
      
      {/* HEADER CON BOTÓN VOLVER */}
      <div className="max-w-5xl mx-auto mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-medium group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Volver al Sistema
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-teal-700">
               <Shield size={24} />
               <span className="text-sm font-bold uppercase tracking-wider">Compliance & Trust v5.4</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Centro de Transparencia y Legalidad</h1>
            <p className="text-slate-500 mt-1">Marco normativo, seguridad técnica y términos de uso de VitalScribe AI.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all">
            <Download size={18} />
            <span className="text-sm font-bold">Descargar Dossier PDF</span>
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'dossier' 
                ? 'border-teal-500 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Server size={18} />
            DOSSIER TÉCNICO Y NORMATIVO
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'terms' 
                ? 'border-teal-500 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Scale size={18} />
            TÉRMINOS Y RESPONSABILIDAD
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-5xl mx-auto pb-12">
        
        {/* PESTAÑA 1: DOSSIER TÉCNICO */}
        {activeTab === 'dossier' && (
          <div className="space-y-6 animate-fade-in-up">
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Resumen Ejecutivo de Arquitectura</h3>
              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                **VitalScribe AI (v5.4)** es una plataforma de **Inteligencia Ambiental Clínica** diseñada para mitigar el *burnout* médico. 
                Opera bajo una arquitectura **Hybrid-Cloud** segura y cumple con las normativas **NOM-004** y **NOM-024** como 
                Software de Apoyo a la Gestión Administrativa, garantizando la soberanía de datos y la responsabilidad clínica humana.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex gap-4 items-start">
                   <div className="mt-1 p-2 bg-teal-50 rounded-lg"><CheckCircle size={20} className="text-teal-600" /></div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-base">Clasificación Regulatoria (COFEPRIS/México)</h4>
                      <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                        VitalScribe AI se clasifica como <strong>Software de Gestión Administrativa y Documental</strong>. 
                        No realiza diagnósticos autónomos. Cumple con la <strong>NOM-004-SSA3-2012</strong> para la integración de la Historia Clínica y la <strong>NOM-024-SSA3-2012</strong> mediante el uso de estándares de interoperabilidad y seguridad.
                      </p>
                   </div>
                </div>

                <div className="flex gap-4 items-start">
                   <div className="mt-1 p-2 bg-sky-50 rounded-lg"><Lock size={20} className="text-sky-600" /></div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-base">Infraestructura de Cifrado AES-256</h4>
                      <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                        Toda la información sensible se encuentra cifrada bajo el estándar <strong>Advanced Encryption Standard (AES-256)</strong>. Los datos del paciente están aislados mediante <strong>Row Level Security (RLS)</strong> en Supabase, impidiendo técnicamente cualquier fuga de información entre cuentas médicas.
                      </p>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                     <Server size={20} className="text-indigo-500"/>
                     <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Procesamiento IA Privado</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Utilizamos <strong>Google Vertex AI</strong> con nodos privados. Sus datos no son compartidos con modelos públicos ni se utilizan para el entrenamiento de algoritmos externos, preservando el secreto profesional médico en todo momento.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                     <FileJson size={20} className="text-orange-500"/>
                     <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Portabilidad y Soberanía</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Garantizamos la propiedad del médico sobre sus datos. Exportación disponible en <strong>JSON y PDF estructurado</strong> para facilitar la migración de expedientes o auditorías clínicas externas.
                  </p>
                </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: TÉRMINOS LEGALES */}
        {activeTab === 'terms' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Términos y Condiciones de Uso</h3>
            <p className="text-xs text-slate-400 mb-6 uppercase">Última actualización: Enero 2026</p>

            <div className="space-y-6 text-sm text-slate-600">
              <section className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18}/> Descargo de Responsabilidad Médica
                </h4>
                <p className="text-amber-900/80 italic">VitalScribe AI es una herramienta de asistencia. La validación, edición y firma final de cualquier documento clínico generado por el sistema es responsabilidad absoluta y exclusiva del médico usuario facultado.</p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 mb-2">1. Capacidad del Usuario</h4>
                <p>El servicio está restringido a profesionales de la salud debidamente acreditados con cédula profesional vigente en México. El usuario es responsable de la veracidad de sus credenciales.</p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 mb-2">2. Uso de la IA y Consentimiento</h4>
                <p>El médico debe obtener el consentimiento verbal del paciente antes de utilizar la función de escucha activa. El software genera un "borrador" que debe ser supervisado por el ojo humano antes de ser legalizado.</p>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TermsOfService;