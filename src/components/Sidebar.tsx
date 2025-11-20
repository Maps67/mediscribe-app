import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, Users, Smartphone, LogOut } from 'lucide-react';
import { MedicalDataService } from '../services/supabaseService';

// Props opcionales para mantener compatibilidad temporal con App.tsx
interface SidebarProps {
  currentView?: any;
  setView?: any;
}

const Sidebar: React.FC<SidebarProps> = () => {
  
  const handleLogout = async () => {
    const service = new MedicalDataService();
    await service.signOut();
    // La suscripción en App.tsx detectará el cambio de sesión y redirigirá al AuthView
  };

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/consultation', icon: <Stethoscope size={20} />, label: 'Consulta IA' },
    { path: '/patients', icon: <Users size={20} />, label: 'Pacientes' },
    { path: '/card', icon: <Smartphone size={20} />, label: 'Tarjeta Digital' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-slate-200 fixed left-0 top-0 z-50">
      {/* Header / Logo */}
      <div className="p-6 flex items-center space-x-2 border-b border-slate-100">
        <div className="bg-teal-500 p-2 rounded-lg">
          <Stethoscope className="text-white h-6 w-6" />
        </div>
        <span className="text-xl font-bold text-slate-800">MediScribe AI</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                isActive
                  ? 'bg-teal-50 text-teal-700 font-medium border border-teal-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center p-3 mb-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                DR
            </div>
            <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-slate-700 truncate">Dr. Martínez</p>
                <p className="text-xs text-slate-500 truncate">Cardiología</p>
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
  );
};

export default Sidebar;