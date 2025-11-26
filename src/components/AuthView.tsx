import React, { useState } from 'react';
import { Mail, Lock, User, Stethoscope, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthViewProps {
  authService: any; 
  onLoginSuccess: () => void;
  forceResetMode?: boolean;
  onPasswordResetSuccess?: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, forceResetMode = false, onPasswordResetSuccess }) => {
  const [isLogin, setIsLogin] = useState(!forceResetMode);
  const [isResetting, setIsResetting] = useState(forceResetMode);
  const [loading, setLoading] = useState(false);
   
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetting) {
        // 1. FLUJO DE RECUPERACIÓN DE CONTRASEÑA
        if (!password) {
            // Enviar link
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            toast.success("Correo de recuperación enviado. Revisa tu bandeja (y spam).");
            setIsResetting(false);
            setIsLogin(true);
        } else {
            // Actualizar password
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            toast.success("Contraseña actualizada. Ingresa ahora.");
            if (onPasswordResetSuccess) onPasswordResetSuccess();
            setIsResetting(false);
            setIsLogin(true);
        }
      } 
      else if (isLogin) {
        // 2. FLUJO DE LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido a MediScribe AI");
        onLoginSuccess();
      } 
      else {
        // 3. FLUJO DE REGISTRO (FIX CORREGIDO)
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin, 
            data: {
              full_name: fullName,
              specialty: specialty,
            },
          },
        });

        if (error) throw error;

        // Feedback visual claro
        toast.info(
          "¡Registro creado! Por favor verifica tu correo para activar la cuenta.", 
          { duration: 8000, icon: <Mail className="text-brand-teal"/> }
        );
        setIsLogin(true); 
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = error.message;
      if (msg.includes("rate limit") || msg.includes("429")) msg = "Límite de seguridad excedido. Espera unos minutos o contacta soporte.";
      if (msg.includes("Invalid login")) msg = "Credenciales incorrectas.";
      if (msg.includes("already registered")) msg = "Este correo ya está registrado.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-fade-in-up">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/30 text-brand-teal mb-4">
            <Stethoscope size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">MediScribe AI</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            {isResetting ? "Recuperación de cuenta" : isLogin ? "Acceso a su consultorio digital" : "Registro de nuevo especialista"}
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {!isLogin && !isResetting && (
            <>
              <div className="relative group">
                <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-teal transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Nombre Completo (Dr. ...)" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal dark:text-white transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="relative group">
                <Stethoscope className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-teal transition-colors" size={20} />
                <select 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal dark:text-white transition-all appearance-none cursor-pointer"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  <option>Medicina General</option>
                  <option>Cardiología</option>
                  <option>Pediatría</option>
                  <option>Ginecología</option>
                  <option>Dermatología</option>
                  <option>Traumatología</option>
                </select>
              </div>
            </>
          )}

          <div className="relative group">
            <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-teal transition-colors" size={20} />
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal dark:text-white transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          {(!isResetting || (isResetting && password !== '')) && (
             <div className="relative group">
               <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-teal transition-colors" size={20} />
               <input 
                 type="password" 
                 placeholder={isResetting ? "Nueva contraseña" : "Contraseña"} 
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal dark:text-white transition-all"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required={!isResetting} 
               />
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-teal hover:bg-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            {isResetting 
                ? (password ? "Actualizar Contraseña" : "Enviar Link de Recuperación") 
                : (isLogin ? "Ingresar" : "Registrarse")
            }
          </button>
        </form>

        {/* FOOTER LINKS */}
        <div className="mt-6 text-center space-y-2">
          {!isResetting && (
              <p className="text-sm text-slate-500">
                {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                <button 
                  onClick={() => setIsLogin(!isLogin)} 
                  className="text-brand-teal font-bold hover:underline"
                >
                  {isLogin ? "Regístrate" : "Inicia Sesión"}
                </button>
              </p>
          )}
          
          <button 
            onClick={() => {
                setIsResetting(!isResetting);
                setIsLogin(true); 
                setPassword('');
            }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors block w-full"
          >
            {isResetting ? "Volver al inicio de sesión" : "¿Olvidaste tu contraseña?"}
          </button>
        </div>

        {/* ALERTA DE AYUDA */}
        {!isLogin && !isResetting && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-2 items-start border border-blue-100 dark:border-blue-800">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-blue-600 dark:text-blue-300 leading-tight">
                    Al registrarte, recibirás un correo de confirmación. Si no llega en 2 minutos, revisa SPAM.
                </p>
            </div>
        )}

      </div>
    </div>
  );
};

export default AuthView;