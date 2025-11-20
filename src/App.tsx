import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import AuthView from './components/AuthView';
import Dashboard from './routes/Dashboard'; // Importamos el nuevo componente
import { ViewState } from './types';
import { Activity } from 'lucide-react';
import { MedicalDataService } from './services/supabaseService';

// Componente interno que tiene acceso a los hooks del Router
const MainLayout: React.FC<{ 
  session: any; 
  onLogout: () => void; 
}> = ({ session, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Función puente: Traduce la URL actual al ViewState que espera el Sidebar
  const getCurrentView = (): ViewState => {
    switch (location.pathname) {
      case '/consultation': return ViewState.CONSULTATION;
      case '/patients': return ViewState.PATIENTS;
      case '/card': return ViewState.DIGITAL_CARD;
      default: return ViewState.DASHBOARD;
    }
  };

  // Función puente: Traduce el evento del Sidebar a navegación de URL
  const handleSetView = (view: ViewState) => {
    switch (view) {
      case ViewState.CONSULTATION: navigate('/consultation'); break;
      case ViewState.PATIENTS: navigate('/patients'); break;
      case ViewState.DIGITAL_CARD: navigate('/card'); break;
      default: navigate('/'); break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar conectada al Router */}
      <Sidebar currentView={getCurrentView()} setView={handleSetView} />
      
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40">
           <span className="font-bold">MediScribe AI</span>
           <button onClick={() => navigate('/')} className="text-sm bg-slate-800 px-3 py-1 rounded">Menú</button>
        </div>
        
        {/* Definición de Rutas */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/consultation" element={<ConsultationView />} />
          <Route path="/patients" element={<PatientsView />} />
          <Route path="/card" element={<DigitalCard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const authService = useRef(new MedicalDataService());

  useEffect(() => {
    const client = authService.current.supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.current.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
         <Activity className="animate-spin mr-2" /> Cargando sistema seguro...
      </div>
    );
  }

  if (!session) {
    return <AuthView authService={authService.current} onLoginSuccess={() => {}} />;
  }

  return (
    <BrowserRouter>
      <MainLayout session={session} onLogout={handleLogout} />
    </BrowserRouter>
  );
};

export default App;