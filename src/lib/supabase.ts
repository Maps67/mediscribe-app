import { createClient } from '@supabase/supabase-js';

// Accedemos a las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación Estricta: Si faltan llaves, la app no debe iniciar (Fail Fast)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('🚨 CRÍTICO: Faltan las variables de entorno de Supabase. Verifique .env');
}

/**
 * CLIENTE SUPABASE (SINGLETON)
 * Configurado para PWA con persistencia de sesión y soporte RLS.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true, // Mantiene al médico logueado aunque cierre el navegador
      autoRefreshToken: true, // Renueva el token de seguridad automáticamente
      detectSessionInUrl: true, // Necesario para los links de "Recuperar Contraseña"
      storage: window.localStorage // Explicita el almacenamiento local del navegador
    },
    db: {
      schema: 'public'
    }
  }
);