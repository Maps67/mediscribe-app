import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, Lock, FileText } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-fade-in-up font-sans">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-medium"
      >
        <ChevronLeft size={20} /> Volver
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        <div className="bg-slate-50 p-8 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white rounded-xl shadow-sm text-teal-600">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Aviso de Privacidad Simplificado</h1>
                    <p className="text-slate-500 text-sm">Última actualización: Noviembre 2025</p>
                </div>
            </div>
        </div>

        <div className="p-8 text-slate-700 leading-relaxed space-y-6">
            <p className="text-lg font-medium text-slate-800">
                <strong>PixelArte Studio</strong>, con domicilio en México, es el responsable del uso y protección de sus datos personales.
            </p>

            <div>
                <h3 className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-3">
                    <FileText size={20} className="text-teal-600"/> 1. Finalidades del Tratamiento (NOM-004)
                </h3>
                <p className="mb-2">
                    Los datos personales y <strong>datos personales sensibles (referentes al estado de salud)</strong> que recabamos a través de la plataforma <strong>VitalScribe AI</strong>, son utilizados para:
                </p>
                <ul className="list-disc pl-5 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <li>Gestión de agenda médica y administración de expedientes clínicos conforme a la <strong>NOM-004-SSA3-2012</strong>.</li>
                    <li>Generación automatizada de notas clínicas y recetas mediante Inteligencia Artificial.</li>
                    <li>Almacenamiento seguro, encriptado y confidencial de su historial médico y el de sus pacientes.</li>
                </ul>
            </div>

            <div>
                <h3 className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-3">
                    <Lock size={20} className="text-teal-600"/> 2. Seguridad y Derechos ARCO
                </h3>
                <p>
                    La información está protegida con <strong>Seguridad a Nivel de Fila (RLS)</strong>. El Médico Usuario es el <strong>Responsable del Expediente Clínico</strong> ante sus pacientes. Para ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), por favor contactar a: <a href="mailto:contacto@pixelartestudio.art" className="text-teal-600 hover:underline font-bold">contacto@pixelartestudio.art</a>
                </p>
            </div>
        </div>

        <div className="bg-slate-900 text-slate-400 p-8 text-center text-xs mt-4">
            <p className="mb-2">
                © {new Date().getFullYear()} <span className="text-white font-bold">VitalScribe AI</span>. Desarrollado por PixelArte Studio.
            </p>
            <p>Todos los derechos reservados. v2.4 Golden.</p>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;