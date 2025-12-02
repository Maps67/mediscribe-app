import React from 'react';
import AuthView from '../components/AuthView';
import { supabase } from '../lib/supabase';

interface UpdatePasswordProps {
  onSuccess?: () => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onSuccess }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-bold text-white">Seguridad MediScribe</h1>
          <p className="text-slate-400 text-sm">Actualización de Credenciales</p>
        </div>
        <div className="p-6">
          {/* Forzamos el modo reset y pasamos la instancia de supabase */}
          <AuthView 
            authService={{ supabase }} 
            forceResetMode={true} 
            onPasswordResetSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;