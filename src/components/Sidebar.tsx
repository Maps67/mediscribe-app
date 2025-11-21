import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, Users, Smartphone, LogOut, X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: any;
  setView?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // Estado para datos del perfil real
  const [profile, setProfile] = useState({ name: 'Cargando...', specialty: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Intentamos buscar el perfil
      const { data } = await supabase
        .from('profiles')
        .select('full_name, specialty')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile({ 
            name: data.full_name || 'Doctor(a)', 
            specialty: data.specialty || 'Medicina General' 
        });
      } else {
        // Si no existe perfil aun (usuario viejo), mostramos default
        setProfile({ name: 'Bienvenido', specialty: 'Configure su perfil' });
      }
    }
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/consultation', icon: <Stethoscope size={20} />, label: 'Consulta IA' },
    { path: '/patients', icon: <Users size={20} />, label: 'Pacientes' },
    { path: '/card', icon: <Smartphone size={20} />, label: 'Tarjeta Digital' },
    // Nuevo botón de configuración
    { path: '/settings', icon: <Settings size={20} />, label: 'Configuración' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden glass" onClick={onClose} />
      )}

      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="bg-brand-teal p-2 rounded-lg">
              <Stethoscope className="text-white h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-slate-800">MediScribe</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? 'bg-teal-50 text-brand-teal font-medium border border-teal-100 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / Perfil Dinámico */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center p-3 mb-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-brand-teal font-bold text-xs shrink-0">
                  DR
              </div>
              <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 truncate">{profile.name}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-wide">{profile.specialty}</p>
              </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 px-4 py-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;