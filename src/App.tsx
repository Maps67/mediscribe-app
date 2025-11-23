import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner'; // <--- IMPORTACIÓN CRÍTICA
import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import Dashboard from './routes/Dashboard';
import CalendarView from './components/CalendarView';
import { Activity, Menu } from 'lucide-react';
import { ViewState } from './types';

const MainLayout: React.FC<{ session: any; onLogout: () => void }> = ({ session }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentView = (): ViewState => {
    switch (location.pathname) {
      case '/consultation': return ViewState.CONSULTATION;
      case '/calendar': return ViewState.CALENDAR;
      case '/patients': return ViewState.PATIENTS;
      case '/card': return ViewState.DIGITAL_CARD;
      default: return ViewState.DASHBOARD;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
           <span className="font-bold flex items-center gap-2">
             <Activity className="text-brand-teal" size={20} />
             MediScribe AI
           </span>
           <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
             <Menu size={24} />
           </button>
        </div>
        <div className="flex-1 overflow-hidden h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consultation" element={<ConsultationView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/patients" element={<PatientsView />} />
            <Route path="/card" element={<DigitalCard />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400"><Activity className="animate-spin mr-2" /> Cargando sistema...</div>;
  }

  if (!session) {
    // También agregamos el Toaster aquí por si hay errores de login
    return (
        <>
            <Toaster position="top-center" richColors />
            <AuthView authService={{ supabase }} onLoginSuccess={() => {}} />
        </>
    );
  }

  return (
    <BrowserRouter>
      {/* COMPONENTE DE NOTIFICACIONES GLOBAL */}
      <Toaster position="top-center" richColors closeButton />
      
      <MainLayout session={session} onLogout={async () => await supabase.auth.signOut()} />
    </BrowserRouter>
  );
};

export default App;