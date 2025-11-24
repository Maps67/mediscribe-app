import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';

import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import Dashboard from './pages/Dashboard';
import CalendarView from './components/CalendarView';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReloadPrompt from './components/ReloadPrompt';
import SplashScreen from './components/SplashScreen';
// --- NUEVO IMPORT ---
import MobileTabBar from './components/MobileTabBar';
import { ViewState } from './types';

// --- LAYOUT PRINCIPAL MODIFICADO ---
const MainLayout: React.FC<{ session: any; onLogout: () => void }> = ({ session }) => {
  // Ya no necesitamos estado de sidebar open para móvil
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* SIDEBAR: AHORA SOLO VISIBLE EN ESCRITORIO (hidden md:flex) */}
      <div className="hidden md:flex z-20">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
        
        {/* --- HEADER MÓVIL VIEJO ELIMINADO --- */}
        
        <div className="flex-1 overflow-hidden h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consultation" element={<ConsultationView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/patients" element={<PatientsView />} />
            <Route path="/card" element={<DigitalCard />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* --- NUEVA BARRA INFERIOR MÓVIL (Solo visible en móvil) --- */}
        <MobileTabBar />

      </main>
    </div>
  );
};
// ------------------------------------

const App: React.FC = () => {
  // ... (El resto de la lógica de sesión y splash screen se mantiene IGUAL)
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  if (showSplash) return <ThemeProvider><SplashScreen /></ThemeProvider>;
  if (!session) return <ThemeProvider><Toaster position="top-center" richColors /><ReloadPrompt /><AuthView authService={{ supabase }} onLoginSuccess={() => {}} /></ThemeProvider>;

  return (
    <ThemeProvider>
        <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <ReloadPrompt />
        <MainLayout session={session} onLogout={async () => await supabase.auth.signOut()} />
        </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;