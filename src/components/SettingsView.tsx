import React, { useState, useEffect } from 'react';
import { Save, User, Stethoscope, Hash, Phone, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Campos del formulario
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setSpecialty(data.specialty || '');
        setLicense(data.license_number || '');
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");

      const updates = {
        id: user.id,
        full_name: fullName,
        specialty,
        license_number: license,
        phone,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      alert("Perfil actualizado correctamente");
      // Recargamos para que el Sidebar tome el nombre nuevo
      window.location.reload();
    } catch (error) {
      alert("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando perfil...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Configuración de Perfil</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-700">Datos del Profesional</h3>
            <p className="text-xs text-slate-500">Esta información aparecerá en sus recetas.</p>
          </div>
          <div className="bg-brand-teal/10 p-2 rounded-full text-brand-teal">
            <User size={24} />
          </div>
        </div>
        
        <form onSubmit={updateProfile} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <User size={16} className="text-brand-teal"/> Nombre Completo
              </label>
              <input 
                type="text" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none transition-all"
                placeholder="Dr. Juan Pérez"
              />
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Stethoscope size={16} className="text-brand-teal"/> Especialidad
              </label>
              <input 
                type="text" 
                value={specialty} 
                onChange={e => setSpecialty(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none transition-all"
                placeholder="Cardiología"
              />
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Hash size={16} className="text-brand-teal"/> Cédula Profesional
              </label>
              <input 
                type="text" 
                value={license} 
                onChange={e => setLicense(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none transition-all"
                placeholder="12345678"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-brand-teal"/> Teléfono Consultorio
              </label>
              <input 
                type="text" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none transition-all"
                placeholder="55 1234 5678"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-brand-teal text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-600 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;