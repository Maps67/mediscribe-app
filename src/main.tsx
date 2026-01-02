import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Importamos el registro de la PWA (Esto activa la instalación en Android)
import { registerSW } from 'virtual:pwa-register'

// Configuración de actualización automática
const updateSW = registerSW({
  onNeedRefresh() {
    // Si hay una nueva versión, preguntamos al usuario o actualizamos
    if (confirm('Nueva versión de VitalScribe disponible. ¿Actualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App lista para trabajar offline');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)