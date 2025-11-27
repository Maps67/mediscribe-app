import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js'; 
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { LogOut, ShieldCheck } from 'lucide-react'; // Iconos para la despedida

// Components & Pages
import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import Dashboard from './pages/Dashboard';
import ReportsView from './pages/ReportsView';
import CalendarView from './components/CalendarView';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReloadPrompt from './components/ReloadPrompt';
import SplashScreen from './components/SplashScreen';
import MobileTabBar from './components/MobileTabBar';
import TermsOfService from './pages/TermsOfService';

// INTERFACES ESTRICTAS
interface MainLayoutProps {
  session: Session | null;
  onLogout: () => Promise<void>;
}

const MainLayout: React.FC<MainLayoutProps> = ({ session, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:flex z-20">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* SIDEBAR MÓVIL */}
      <div className="md:hidden">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
        
        {/* Padding bottom (pb-20) para móviles */}
        <div className="flex-1 overflow-hidden h-full pb-20 md:pb-0"> 
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consultation" element={<ConsultationView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/patients" element={<PatientsView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/card" element={<DigitalCard />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            {/* RUTA DE TÉRMINOS LEGALES */}
            <Route path="/terms" element={<TermsOfService />} />
            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* BARRA INFERIOR MÓVIL */}
        <div className="md:hidden">
          <MobileTabBar />
        </div>

        {/* Botón de Logout Móvil Oculto (Lógica manejada por Sidebar, pero accesible globalmente si se requiere) */}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  // Estado para detectar flujo crítico de recuperación
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  
  // NUEVO: Estado para la animación de cierre de sesión
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Obtener sesión inicial
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error crítico al inicializar sesión:', error);
      }
    };

    initSession();

    // 2. Escuchar eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
      } else if (event === 'SIGNED_OUT') {
        setIsRecoveryFlow(false);
        setSession(null);
        setIsClosing(false); // Asegurar que se quite la pantalla de cierre
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setIsRecoveryFlow(false); 
      }
      
      setLoading(false);
    });

    const splashTimer = setTimeout(() => {
      if (mounted) setShowSplash(false);
    }, 2500);

    return () => { 
      mounted = false;
      subscription.unsubscribe(); 
      clearTimeout(splashTimer); 
    };
  }, []);

  // --- LÓGICA DE CIERRE ELEGANTE ---
  const handleGlobalLogout = async () => {
    setIsClosing(true); // Activa la pantalla de despedida
    
    // UX: Pequeña pausa para mostrar el mensaje "Cerrando de forma segura..."
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        setIsClosing(false); // Si falla, quitamos la pantalla para que el usuario reintente
    }
  };

  // --- PANTALLAS DE ESTADO ---

  if (showSplash) return <ThemeProvider><SplashScreen /></ThemeProvider>;

  // PANTALLA DE DESPEDIDA (Transición de Salida)
  if (isClosing) {
      return (
        <ThemeProvider>
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 animate-fade-in">
                <div className="p-6 bg-slate-800 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-700">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <LogOut className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Cerrando Sesión...</h2>
                    <p className="text-slate-400 text-sm mb-4">Guardando cambios y limpiando datos.</p>
                    <div className="flex items-center gap-2 text-xs text-brand-teal bg-brand-teal/10 px-3 py-1 rounded-full">
                        <ShieldCheck size={12} /> Conexión segura finalizada
                    </div>
                </div>
            </div>
        </ThemeProvider>
      );
  }

  // PROTECCIÓN DE RUTAS
  if (!session || isRecoveryFlow) {
    return (
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        <ReloadPrompt />
        <AuthView 
          authService={{ supabase }} 
          onLoginSuccess={() => { /* Redirección automática por evento */ }} 
          forceResetMode={isRecoveryFlow}
          onPasswordResetSuccess={() => setIsRecoveryFlow(false)}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <ReloadPrompt />
        <MainLayout 
          session={session} 
          onLogout={handleGlobalLogout} // Pasamos la función nueva
        />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;