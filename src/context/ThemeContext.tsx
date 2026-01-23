import React, { createContext, useContext, useEffect, useState } from 'react';

// Mantenemos los tipos para que TypeScript no se queje en otros archivos
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. CAMBIO RADICAL: El estado inicial SIEMPRE es 'light'.
  // Eliminamos la lectura de localStorage y la detección del sistema operativo.
  const [theme] = useState<Theme>('light');

  // 2. EL GUARDIÁN DE LA LUZ
  // Este efecto se asegura de limpiar la clase 'dark' violentamente al iniciar.
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Eliminamos la clase oscura si existe
    root.classList.remove('dark');
    // Forzamos la clase clara
    root.classList.add('light');
    
    // Forzamos el esquema de color nativo del navegador (scrollbars, inputs)
    root.style.colorScheme = 'light';
    
    // Limpiamos cualquier preferencia guardada anteriormente para evitar conflictos
    localStorage.removeItem('theme');
  }, []);

  // 3. NEUTRALIZAR EL TOGGLE
  // Si algún botón en la interfaz intenta cambiar el tema, esta función no hace nada
  // o simplemente refuerza el modo claro.
  const toggleTheme = () => {
    console.log('🚫 Cambio de tema deshabilitado: VitalScribe es Light Mode Only.');
    // No llamamos a setTheme. El estado permanece inmutable en 'light'.
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};