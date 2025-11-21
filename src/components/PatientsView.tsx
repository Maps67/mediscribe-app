import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Calendar, User, X, Save, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del Modal "Nuevo Paciente"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");

      const { error } = await supabase.from('patients').insert([
        {
          name: newPatientName,
          phone: newPatientPhone,
          doctor_id: user.id,
          // condition: 'General' // Puedes agregar más campos si quieres
        }
      ]);

      if (error) throw error;

      // Limpiar y recargar
      setNewPatientName('');
      setNewPatientPhone('');
      setIsModalOpen(false);
      fetchPatients(); // Recargar lista
    } catch (error) {
      alert("Error al crear paciente");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado en tiempo real
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER Y ACCIONES */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Directorio de Pacientes</h2>
          <p className="text-slate-500 text-sm">Gestione sus expedientes y contactos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Paciente
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre..." 
          className="flex-1 outline-none text-slate-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTA DE PACIENTES */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Cargando directorio...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <User size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron pacientes.</p>
          <p className="text-xs text-slate-400">Agregue uno nuevo para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                {/* Botón para ver historial (Futuro) */}
                <button className="text-slate-300 hover:text-brand-teal">
                  <FileText size={18} />
                </button>
              </div>
              
              <h3 className="font-bold text-slate-800 text-lg truncate">{patient.name}</h3>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone size={14} />
                  <span>{patient.phone || "Sin teléfono"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={14} />
                  <span className="text-xs">Registrado: {new Date(patient.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Acciones rápidas */}
              {patient.phone && (
                 <a 
                   href={`https://wa.me/${patient.phone}`} 
                   target="_blank" 
                   rel="noreferrer"
                   className="mt-4 block text-center py-2 text-xs font-bold text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                 >
                   Enviar WhatsApp
                 </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NUEVO PACIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Registrar Paciente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  placeholder="Ej. María González"
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                <input 
                  type="tel" 
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  placeholder="Ej. 5512345678"
                  value={newPatientPhone}
                  onChange={e => setNewPatientPhone(e.target.value)}
                />
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-brand-teal text-white py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Paciente</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsView;
