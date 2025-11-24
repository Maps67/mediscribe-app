import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Stethoscope, Settings } from 'lucide-react';

const MobileTabBar: React.FC = () => {
  
  const tabs = [
    { path: '/', icon: LayoutDashboard, label: 'Inicio' },
    { path: '/calendar', icon: Calendar, label: 'Agenda' },
    // El icono central de acción principal
    { path: '/consultation', icon: Stethoscope, label: 'Consulta IA', isMain: true },
    { path: '/patients', icon: Settings, label: 'Pacientes' }, // Usamos Settings icon para "Gestión" por ahora para que cuadre con la imagen
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe-area-inset-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 transition-colors duration-300">
      <div className="flex justify-around items-end h-16 px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full pb-2 pt-1 transition-all duration-200 relative group
              ${isActive ? 'text-brand-teal' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
            `}
          >
            {({ isActive }) => (
                <>
                    {/* Indicador superior activo */}
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-teal rounded-full transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                    
                    <div className={`
                        ${tab.isMain ? 'bg-brand-teal text-white p-2.5 rounded-2xl shadow-lg shadow-teal-200 dark:shadow-none mb-1 transform transition-transform group-active:scale-95' : ''}
                        ${isActive && !tab.isMain ? 'scale-110' : ''}
                    `}>
                        <tab.icon size={tab.isMain ? 24 : 22} strokeWidth={isActive || tab.isMain ? 2.5 : 2} />
                    </div>
                    
                    {!tab.isMain && (
                        <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-brand-teal' : ''}`}>
                            {tab.label}
                        </span>
                    )}
                </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;