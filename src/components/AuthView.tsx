import React, { useState } from 'react';
import { Mail, Lock, User, Stethoscope, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AuthProps {
  authService: any;
  onLoginSuccess: () => void;
}

const AuthView: React.FC<AuthProps> = ({ authService, onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    specialty: 'Medicina General'
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        const { error } = await authService.supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              specialty: formData.specialty,
            },
          },
        });

        if (error) throw error;
        setVerificationSent(true);
        toast.success("Cuenta creada correctamente");

      } else {
        const { error } = await authService.supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg === "Invalid login credentials") msg = "Correo o contraseña incorrectos";
      if (msg === "User already registered") msg = "Este correo ya está registrado";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Casi listo, Doctor!</h2>
          <p className="text-slate-600 mb-6">
            Hemos enviado un enlace de confirmación a: <br/>
            <span className="font-bold text-brand-teal">{formData.email}</span>
          </p>

          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-8 text-left flex gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5"/>
            <p>Por seguridad, debe entrar a su correo y dar clic en el enlace para activar su cuenta antes de iniciar sesión.</p>
          </div>

          <button 
            onClick={() => {
                setVerificationSent(false);
                setIsRegistering(false);
            }}
            className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all"
          >
            Entendido, ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Panel Izquierdo (Visual) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <img 
                src="/pwa-192x192.png" 
                alt="Logo MediScribe" 
                className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg object-cover"
            />
            <h1 className="text-5xl font-bold tracking-tight">MediScribe AI</h1>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">El asistente clínico inteligente para médicos modernos.</h2>
          <p className="text-slate-400 text-lg">Automatice sus notas clínicas, gestione su agenda y recupere su tiempo con el poder de la IA.</p>
          
          <div className="mt-12 flex gap-8">
            <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-brand-teal">NOM-004</span>
                <span className="text-sm text-slate-400">Cumplimiento Normativo</span>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-brand-teal">IA 2.0</span>
                <span className="text-sm text-slate-400">Reconocimiento de Voz</span>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-brand-teal">100%</span>
                <span className="text-sm text-slate-400">Seguro y Privado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho (Formulario) */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Crear Cuenta Médica' : 'Bienvenido de nuevo'}</h2>
            <p className="mt-2 text-slate-500">{isRegistering ? 'Comience su prueba piloto hoy mismo.' : 'Ingrese sus credenciales para acceder.'}</p>
          </div>

          <form className="space-y-6" onSubmit={handleAuth}>
            
            {isRegistering && (
                <div className="space-y-4 animate-fade-in-up">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><User size={20}/></div>
                            <input required type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all" placeholder="Dr. Juan Pérez" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Stethoscope size={20}/></div>
                            <input type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all" placeholder="Ej. Cardiología" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                        </div>
                    </div>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={20} /></div>
                <input required type="email" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all" placeholder="doctor@ejemplo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={20} /></div>
                <input required type="password" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-teal hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                  <>{isRegistering ? 'Registrarse' : 'Iniciar Sesión'} <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-brand-teal hover:text-teal-700 transition-colors">
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} MediScribe AI. Desarrollado por <span className="font-bold text-slate-500">PixelArte Studio</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;