import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js'; 
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';

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

// INTERFACES ESTRICTAS
interface MainLayoutProps {
  session: Session | null;
  onLogout: () => Promise<void>;
}

const MainLayout: React.FC<MainLayoutProps> = ({ session }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:flex z-20">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* SIDEBAR MÓVIL (Drawer) - Debe tener z-index mayor a MobileTabBar (z-40) */}
      <div className="md:hidden">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
        
        {/* Padding bottom (pb-20) aumentado para asegurar que el contenido no quede detrás del TabBar */}
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
            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* BARRA INFERIOR MÓVIL */}
        <div className="md:hidden">
          <MobileTabBar />
        </div>

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

  if (showSplash) return <ThemeProvider><SplashScreen /></ThemeProvider>;

  // PROTECCIÓN DE RUTAS
  if (!session || isRecoveryFlow) {
    return (
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        <ReloadPrompt />
        <AuthView 
          authService={{ supabase }} 
          onLoginSuccess={() => { /* La redirección la maneja el useEffect 'SIGNED_IN' */ }} 
          forceResetMode={isRecoveryFlow}
          onPasswordResetSuccess={() => {
             setIsRecoveryFlow(false);
          }}
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
          onLogout={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) console.error("Error al cerrar sesión:", error);
          }} 
        />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;