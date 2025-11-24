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
import ReportsView from './pages/ReportsView'; // <--- IMPORTAR LA NUEVA VISTA
import CalendarView from './components/CalendarView';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReloadPrompt from './components/ReloadPrompt';
import SplashScreen from './components/SplashScreen';
import MobileTabBar from './components/MobileTabBar';
import { Menu } from 'lucide-react';

const MainLayout: React.FC<{ session: any; onLogout: () => void }> = ({ session }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:flex z-20">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* SIDEBAR MÓVIL (Drawer) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
        
        <div className="flex-1 overflow-hidden h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consultation" element={<ConsultationView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/patients" element={<PatientsView />} />
            <Route path="/reports" element={<ReportsView />} /> {/* <--- RUTA CONECTADA */}
            <Route path="/card" element={<DigitalCard />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* BARRA INFERIOR MÓVIL */}
        <MobileTabBar />

      </main>
    </div>
  );
};

const App: React.FC = () => {
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