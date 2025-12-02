import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, User, Stethoscope, ArrowRight, AlertTriangle, 
  KeyRound, ArrowLeft, CheckCircle2, BookOpen,
  Eye, EyeOff, FileBadge, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthProps {
  authService?: any;
  onLoginSuccess?: () => void;
  forceResetMode?: boolean;
  onPasswordResetSuccess?: () => void;
}

const AuthView: React.FC<AuthProps> = ({ 
  onLoginSuccess, 
  forceResetMode = false, 
  onPasswordResetSuccess 
}) => {
  // ESTADOS
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(forceResetMode);
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    newPassword: '',
    fullName: '',
    specialty: 'Medicina General',
    cedula: '', 
    termsAccepted: false 
  });

  // Efecto simple: Si el padre dice "Modo Reset", obedecemos.
  useEffect(() => {
    if (forceResetMode) {
      setIsResettingPassword(true);
      setIsRecovering(false);
      setIsRegistering(false);
    }
  }, [forceResetMode]);

  const validatePasswordStrength = (pass: string): string | null => {
    if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "La contraseña debe incluir al menos una Mayúscula.";
    if (!/[0-9]/.test(pass)) return "La contraseña debe incluir al menos un Número.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "La contraseña debe incluir un Símbolo (!@#$%).";
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        const cedulaLimpia = formData.cedula.trim();
        if (!/^\d+$/.test(cedulaLimpia) || cedulaLimpia.length < 7 || cedulaLimpia.length > 8) {
             toast.error("Cédula inválida (7-8 dígitos numéricos).");
             setLoading(false); return;
        }
        const passError = validatePasswordStrength(formData.password);
        if (passError) { toast.error(passError); setLoading(false); return; }
        if (!formData.termsAccepted) { toast.error("Debe aceptar términos."); setLoading(false); return; }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.fullName, specialty: formData.specialty, cedula: cedulaLimpia } },
        });
        if (error) throw error;
        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: formData.fullName,
                specialty: formData.specialty,
                cedula: cedulaLimpia,
                email: formData.email
            });
        }
        setVerificationSent(true);
        toast.success("Cuenta creada.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
        if (error) throw error;
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (error: any) {
      toast.error(error.message === "Invalid login credentials" ? "Credenciales incorrectas" : error.message);
    } finally { setLoading(false); }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // --- CLAVE DEL ÉXITO: REDIRECCIÓN EXPLÍCITA A LA RUTA DEDICADA ---
      const redirectUrl = `${window.location.origin}/update-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: redirectUrl, 
      });
      
      if (error) throw error;
      setRecoverySent(true);
      toast.success("Correo enviado.");
    } catch (error: any) {
      toast.error(error.message);
    } finally { setLoading(false); }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const passError = validatePasswordStrength(formData.newPassword);
    if (passError) return toast.error(passError);

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada.");
      if (onPasswordResetSuccess) onPasswordResetSuccess();
      else if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally { setLoading(false); }
  };

  if (verificationSent) return (
      <div className="text-center p-8">
          <Mail size={40} className="mx-auto text-green-600 mb-4"/>
          <h2 className="text-xl font-bold">Verifique su correo</h2>
          <button onClick={() => setVerificationSent(false)} className="mt-4 text-brand-teal font-bold hover:underline">Volver al inicio</button>
      </div>
  );

  if (recoverySent) return (
      <div className="text-center p-8">
          <KeyRound size={40} className="mx-auto text-blue-600 mb-4"/>
          <h2 className="text-xl font-bold">Correo enviado</h2>
          <p className="text-sm text-slate-500 mt-2">Revise su bandeja de entrada y siga el enlace.</p>
          <button onClick={() => setRecoverySent(false)} className="mt-4 text-brand-teal font-bold hover:underline">Volver</button>
      </div>
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {!isResettingPassword && !forceResetMode && (
         <div className="text-center lg:text-left">
            {!isRecovering && (
                <>
                    <h2 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Alta de Médico' : 'Bienvenido'}</h2>
                    <p className="mt-2 text-slate-500">{isRegistering ? 'Únase a la revolución IA.' : 'Acceda a su consultorio.'}</p>
                </>
            )}
         </div>
      )}

      {isResettingPassword ? (
         <form className="space-y-5" onSubmit={handlePasswordUpdate}>
            <div className="text-center mb-4"><CheckCircle2 size={32} className="mx-auto text-brand-teal"/> <h3 className="font-bold">Nueva Contraseña</h3></div>
            <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-slate-400"/>
                <input required type={showPassword ? "text" : "password"} className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Nueva clave segura" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400"><Eye size={18}/></button>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : 'Actualizar'}</button>
         </form>
      ) : isRecovering ? (
         <form className="space-y-5" onSubmit={handleRecoveryRequest}>
            <button type="button" onClick={() => setIsRecovering(false)} className="flex items-center gap-2 text-sm text-slate-500 mb-4"><ArrowLeft size={16}/> Volver</button>
            <h2 className="text-2xl font-bold">Recuperar Acceso</h2>
            <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-slate-400"/>
                <input required type="email" className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Su correo" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : 'Enviar Enlace'}</button>
         </form>
      ) : (
         <form className="space-y-5" onSubmit={handleAuth}>
            {isRegistering && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="relative"><User size={18} className="absolute left-3 top-3 text-slate-400"/><input required type="text" className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Nombre completo" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}/></div>
                    <div className="flex gap-4">
                        <div className="relative flex-1"><Stethoscope size={18} className="absolute left-3 top-3 text-slate-400"/><input className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Espec." value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}/></div>
                        <div className="relative flex-1"><FileBadge size={18} className="absolute left-3 top-3 text-slate-400"/><input required type="text" className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Cédula" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value.replace(/\D/g,'')})} maxLength={8}/></div>
                    </div>
                </div>
            )}
            <div className="relative"><Mail size={18} className="absolute left-3 top-3 text-slate-400"/><input required type="email" className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Correo" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
            <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-slate-400"/>
                <input required type={showPassword ? "text" : "password"} className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" placeholder="Contraseña" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400"><Eye size={18}/></button>
            </div>
            {!isRegistering && <div className="flex justify-end"><button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-bold text-brand-teal">¿Olvidó su contraseña?</button></div>}
            {isRegistering && (<div className="flex items-start gap-2 bg-blue-50 p-2 rounded border border-blue-100"><input type="checkbox" required className="mt-1" checked={formData.termsAccepted} onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}/><span className="text-xs text-slate-600">Acepto verificación de Cédula.</span></div>)}
            
            <button type="submit" disabled={loading} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}</button>
         </form>
      )}
      
      {!isResettingPassword && !forceResetMode && (
        <div className="text-center pt-2">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-brand-teal hover:underline">{isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : 'Crear cuenta nueva'}</button>
        </div>
      )}
      {!forceResetMode && (
        <a href="/manual.html" target="_blank" className="block text-center text-xs text-slate-400 mt-8 flex items-center justify-center gap-2 hover:text-brand-teal"><BookOpen size={12}/> Manual de Usuario</a>
      )}
    </div>
  );
};

export default AuthView;