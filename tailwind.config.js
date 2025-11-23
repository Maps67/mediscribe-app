/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- ESTA LÍNEA ES LA CLAVE
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0d9488', 
          dark: '#111827', // Color de fondo para modo oscuro
          darker: '#0f172a', // Color para paneles en modo oscuro
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}