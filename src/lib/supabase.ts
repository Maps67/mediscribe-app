import { createClient } from '@supabase/supabase-js';

// Accedemos a las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación simple para evitar errores en tiempo de ejecución si faltan las claves
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las variables de entorno de Supabase. Verifique su archivo .env.local');
}

// Exportamos la instancia del cliente para usarla en toda la app
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);