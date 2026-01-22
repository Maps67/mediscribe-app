// Archivo: src/pages/PrivacyPolicy.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, Lock, FileText, Database, Cpu, Scale } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-fade-in-up font-sans bg-slate-50 min-h-screen">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-medium group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* HEADER DE SEGURIDAD - Blindaje v5.4 */}
        <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-teal-500 rounded-2xl shadow-lg">
              <Shield size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Aviso de Privacidad Integral</h1>
              <p className="text-teal-400 font-mono text-sm mt-1 uppercase tracking-widest">Protocolo Omni-Sentinel v5.4</p>
              <div className="flex gap-4 mt-2 text-slate-400 text-xs italic text-opacity-80">
                 <span>Certificación: Enero 2026</span>
                 <span>•</span>
                 <span>Ref: LFPDPPP / NOM-024</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 text-slate-700 leading-relaxed space-y-8">
          
          <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100">
            <p className="text-lg font-medium text-slate-800">
              <strong>VitalScribe AI™</strong>, desarrollado por PixelArte Studio, actúa como encargado del tratamiento de datos bajo los más altos estándares de <strong>Soberanía Tecnológica</strong>. El Médico Usuario mantiene la propiedad absoluta y responsabilidad legal del expediente clínico.
            </p>
          </div>

          {/* SECCIÓN 1: CIFRADO Y DATOS */}
          <div>
            <h3 className="flex items-center gap-3 text-slate-900 font-bold text-xl mb-4">
              <Lock size={24} className="text-teal-600"/> 1. Blindaje de Datos (Cifrado Grado Bancario)
            </h3>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <p>
                Implementamos cifrado <strong>AES-256</strong> para proteger la información sensible tanto en reposo como en tránsito. Cumplimos estrictamente con la normativa de confidencialidad de la <strong>NOM-004-SSA3-2012</strong>.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm text-teal-500">
                    <Shield size={16} />
                  </div>
                  <span className="text-sm"><strong>Supabase Security:</strong> Aislamiento por Row Level Security (RLS) que impide accesos no autorizados a nivel motor de base de datos.</span>
                </li>
                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm text-teal-500">
                    <Cpu size={16} />
                  </div>
                  <span className="text-sm"><strong>Inmutabilidad:</strong> Bitácoras forenses que registran cada interacción, garantizando la trazabilidad clínica completa.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* SECCIÓN 2: PROCESAMIENTO IA (Actualizado para coincidir con TermsOfService) */}
          <div>
            <h3 className="flex items-center gap-3 text-slate-900 font-bold text-xl mb-4">
              <Database size={24} className="text-teal-600"/> 2. Procesamiento de IA Privado
            </h3>
            <p className="mb-4">
              La generación de notas clínicas y análisis de riesgo utiliza modelos <strong>Google Gemini™ Enterprise</strong> desplegados en infraestructura <strong>Vertex AI Secure Node</strong>.
            </p>
            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 text-teal-900 text-sm shadow-inner">
              <strong className="block mb-2 font-bold text-teal-800">GARANTÍA DE NO-ENTRENAMIENTO:</strong> 
              Sus datos y los de sus pacientes <strong>NO</strong> se utilizan para el entrenamiento de los modelos públicos de Google. El procesamiento es efímero, aislado y se rige por acuerdos de confidencialidad empresarial (BAA) compatibles con HIPAA/GDPR.
            </div>
          </div>

          {/* SECCIÓN 3: DERECHOS ARCO */}
          <div>
            <h3 className="flex items-center gap-3 text-slate-900 font-bold text-xl mb-4">
              <FileText size={24} className="text-teal-600"/> 3. Gestión y Derechos ARCO
            </h3>
            <p>
              Usted posee soberanía total sobre sus datos médicos. Puede realizar exportaciones masivas en formatos abiertos (.xlsx, .json) en cualquier momento. Para ejercer derechos ARCO (Acceso, Rectificación, Cancelación u Oposición), contacte a: 
              <a href="mailto:contacto@pixelartestudio.art" className="ml-2 text-teal-600 hover:text-teal-700 font-bold underline transition-all">contacto@pixelartestudio.art</a>
            </p>
          </div>
          
          {/* LINK A TÉRMINOS (Cierre del círculo legal) */}
          <div className="pt-4 border-t border-slate-100">
             <button onClick={() => navigate('/terms')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors">
                <Scale size={16} />
                Ver Términos de Servicio y Responsabilidad Médica
             </button>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-slate-900 text-slate-500 p-10 text-center text-xs border-t border-slate-800">
          <p className="mb-2">
            © {new Date().getFullYear()} <span className="text-white font-bold">VitalScribe AI™</span>. Infraestructura Blindada v5.4.
          </p>
          <p className="tracking-widest uppercase font-semibold">Seguridad Clínica | Soberanía de Datos | Cumplimiento NOM-004</p>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;