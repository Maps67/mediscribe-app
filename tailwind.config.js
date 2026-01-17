/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          // --- ZONA DE COMPATIBILIDAD (Lo viejo sigue funcionando) ---
          teal: '#0d9488',     // Tus botones actuales siguen verdes
          dark: '#111827',     // Tus fondos actuales siguen oscuros
          darker: '#0f172a',   // Tus paneles actuales siguen bien

          // --- ZONA PRO (Lo nuevo que uses) ---
          // Mismo color que teal, pero con nombre "semántico" para el futuro
          primary: '#0d9488', 
          'primary-hover': '#0f766e', // Agregamos el hover que faltaba
          
          // Unificamos los grises para cuando quieras limpiar el diseño
          surface: '#1e293b', 
          background: '#0f172a', 
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}