import React, { useState, useEffect } from 'react';
import { Search, UserPlus, FileText, Trash2, Edit2, X, Save, Eye, Calendar, Clock, FileCode, Share2, Printer, Download, FolderOpen, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, DoctorProfile } from '../types';
import { toast } from 'sonner';
import PatientAttachments from './PatientAttachments';
import QuickRxModal from './QuickRxModal';
import FormattedText from './FormattedText'; 
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { DoctorFileGallery } from './DoctorFileGallery'; // IMPORTACIÓN NUEVA

// FIX: Interfaz local para extender Patient y evitar errores de TS
interface PatientData extends Partial<Patient> {
  id: string;
  name: string;
  age: number | string; 
  gender: string;
  phone?: string;
  email?: string;
  history?: string;
  created_at?: string;
}

// Interfaz para el historial de consultas
interface ConsultationRecord {
    id: string;
    created_at: string;
    summary: string;
    transcript: string;
}

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // NUEVO: Estado para la Galería dentro del Historial
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // Estados de selección
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [selectedPatientForRx, setSelectedPatientForRx] = useState<PatientData | null>(null);
  const [viewingPatient, setViewingPatient] = useState<PatientData | null>(null); 
  
  // Datos
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [patientHistory, setPatientHistory] = useState<ConsultationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Masculino',
    phone: '',
    email: '',
    history: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching patients:", error);
      toast.error('Error al cargar pacientes');
    } else {
      setPatients((data as unknown as PatientData[]) || []);
    }
  };

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile(data as DoctorProfile);
    }
  };

  // --- LÓGICA NUEVA: Cargar Historial ---
  const handleViewHistory = async (patient: PatientData) => {
      setViewingPatient(patient);
      setIsHistoryOpen(true);
      setIsGalleryOpen(false); // Resetear galería al abrir para empezar limpio
      setLoadingHistory(true);
      setPatientHistory([]); 

      try {
          const { data, error } = await supabase
            .from('consultations')
            .select('*')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setPatientHistory(data || []);
      } catch (error) {
          console.error(error);
          toast.error("Error al cargar el expediente");
      } finally {
          setLoadingHistory(false);
      }
  };

  // --- ACCIONES INDIVIDUALES DE NOTA ---
  
  const handleShareNoteWhatsApp = (consultation: ConsultationRecord) => {
      if (!viewingPatient) return;
      
      const drName = doctorProfile?.full_name || 'su médico';
      const message = `*Historial Médico - Dr. ${drName}*\n*Paciente:* ${viewingPatient.name}\n*Fecha:* ${new Date(consultation.created_at).toLocaleDateString()}\n\n${consultation.summary}\n\n*Saludos.*`;
      
      const encodedMessage = encodeURIComponent(message);
      let whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      
      if (viewingPatient.phone) {
          const cleanPhone = viewingPatient.phone.replace(/\D/g, '');
          if (cleanPhone.length >= 10) whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      }
      window.open(whatsappUrl, '_blank');
  };

  const handlePrintNote = async (consultation: ConsultationRecord) => {
      if (!viewingPatient || !doctorProfile) return;
      
      try {
          const blob = await pdf(
            <PrescriptionPDF 
                doctorName={doctorProfile.full_name} 
                specialty={doctorProfile.specialty} 
                license={doctorProfile.license_number} 
                phone={doctorProfile.phone} 
                university={doctorProfile.university} 
                address={doctorProfile.address} 
                logoUrl={doctorProfile.logo_url} 
                signatureUrl={doctorProfile.signature_url} 
                patientName={viewingPatient.name} 
                date={new Date(consultation.created_at).toLocaleDateString()} 
                content={consultation.summary} 
            />
          ).toBlob();
          window.open(URL.createObjectURL(blob), '_blank');
      } catch (e) {
          toast.error("Error generando PDF");
      }
  };

  // ... (Resto de funciones CRUD) ...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const patientData = {
        name: formData.name,
        age: parseInt(formData.age) || 0, 
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        history: formData.history,
        doctor_id: user.id
      };

      if (editingPatient) {
        const { error } = await supabase.from('patients').update(patientData).eq('id', editingPatient.id);
        if (error) throw error;
        toast.success('Paciente actualizado');
      } else {
        const { error } = await supabase.from('patients').insert([patientData]);
        if (error) throw error;
        toast.success('Paciente creado');
      }

      setIsModalOpen(false);
      setEditingPatient(null);
      resetForm();
      fetchPatients();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar paciente');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', age: '', gender: 'Masculino', phone: '', email: '', history: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este paciente y todo su historial?')) return;
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
      toast.success('Paciente eliminado');
      fetchPatients();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const openEditModal = (patient: PatientData) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age ? patient.age.toString() : '',
      gender: patient.gender || 'Masculino',
      phone: patient.phone || '',
      email: patient.email || '',
      history: patient.history || ''
    });
    setIsModalOpen(true);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pacientes</h1>
          <p className="text-slate-500 dark:text-slate-400">Gestión de expediente clínico</p>
        </div>
        <button 
          onClick={() => {
            setEditingPatient(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-brand-teal hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"
        >
          <UserPlus size={20} /> <span className="hidden sm:inline">Nuevo Paciente</span>
        </button>
      </div>

      {/* TABLA DE PACIENTES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-teal transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <th className="p-4 font-bold">Nombre</th>
                <th className="p-4 font-bold">Edad/Sexo</th>
                <th className="p-4 font-bold">Contacto</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4">
                    <p className="font-bold text-slate-800 dark:text-white">{patient.name}</p>
                    <p className="text-xs text-slate-400">ID: {patient.id.slice(0,8)}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                    {patient.age} años <br/> {patient.gender}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                    <p>{patient.phone || 'Sin teléfono'}</p>
                    <p className="text-xs text-slate-400">{patient.email}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* BOTÓN: Ver Expediente */}
                      <button 
                        onClick={() => handleViewHistory(patient)} 
                        className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" 
                        title="Ver Expediente Completo"
                      >
                        <Eye size={18} />
                      </button>

                      <button onClick={() => setSelectedPatientForRx(patient)} className="p-2 text-brand-teal hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors" title="Crear Receta Rápida">
                        <FileText size={18} />
                      </button>
                      <button onClick={() => openEditModal(patient)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar Datos">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(patient.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPatients.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              No se encontraron pacientes.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: EDICIÓN/CREACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ... Campos formulario ... */}
                <div className="col-span-2">
                    <label className="label block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                    <input required className="input w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label className="label block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Edad</label>
                    <input required type="number" className="input w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
                <div>
                    <label className="label block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Género</label>
                    <select className="input w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                        <option>Masculino</option><option>Femenino</option><option>Otro</option>
                    </select>
                </div>
                <div>
                    <label className="label block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                    <input className="input w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                    <label className="label block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input type="email" className="input w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="col-span-2">
                    <label className="label block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Antecedentes / Notas</label>
                    <textarea className="input w-full p-2 rounded-lg border h-24 resize-none dark:bg-slate-800 dark:border-slate-700" value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} />
                </div>

                {editingPatient && (
                    <div className="col-span-2 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <label className="label mb-2 block font-bold text-slate-700 dark:text-slate-300">Archivos Adjuntos</label>
                        {/* Reutilizamos la galería pequeña aquí también si se desea */}
                        <PatientAttachments patientId={editingPatient.id} />
                    </div>
                )}

                <div className="col-span-2 flex gap-3 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-brand-teal text-white rounded-xl font-bold hover:bg-teal-600 shadow-lg flex justify-center items-center gap-2"><Save size={18}/> Guardar Paciente</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HISTORIAL CLÍNICO MEJORADO (CON GALERÍA) */}
      {isHistoryOpen && viewingPatient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col relative">
            
            {/* Header Historial */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="text-brand-teal"/> Expediente Clínico
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Paciente: <span className="font-bold">{viewingPatient.name}</span></p>
              </div>
              
              {/* ZONA DE ACCIONES SUPERIOR (NUEVO BOTÓN DE ARCHIVOS) */}
              <div className="flex items-center gap-2">
                  {/* BOTÓN VER ARCHIVOS */}
                  <button 
                    onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                    className={`p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-bold border ${isGalleryOpen ? 'bg-teal-100 text-brand-teal border-teal-200' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-brand-teal'}`}
                    title={isGalleryOpen ? "Ocultar archivos" : "Ver archivos del paciente"}
                  >
                    {isGalleryOpen ? <X size={18}/> : <FolderOpen size={18}/>}
                    <span className="hidden sm:inline">{isGalleryOpen ? 'Cerrar Archivos' : 'Ver Archivos'}</span>
                  </button>

                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

                  <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors"><X size={24}/></button>
              </div>
            </div>

            {/* Cuerpo Historial (Con Slide-Over de Galería) */}
            <div className="flex-1 overflow-hidden relative flex">
                
                {/* Lista de Consultas (Izquierda) */}
                <div className={`flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900 transition-all duration-300 ${isGalleryOpen ? 'w-1/2 opacity-50 md:opacity-100' : 'w-full'}`}>
                    {loadingHistory ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-teal"></div>
                            <p>Cargando historial...</p>
                        </div>
                    ) : patientHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
                            <FileCode size={64} strokeWidth={1} className="mb-4"/>
                            <p className="text-lg">No hay consultas registradas aún.</p>
                            <p className="text-sm">Realice una nueva consulta desde el menú principal.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {patientHistory.map((consultation) => (
                                <div key={consultation.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="bg-slate-50 dark:bg-slate-950 p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        
                                        {/* FECHA Y HORA */}
                                        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                                                <Calendar size={14} className="text-brand-teal"/>
                                                {new Date(consultation.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                                                <Clock size={14} className="text-brand-teal"/>
                                                {new Date(consultation.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>

                                        {/* BOTONES DE ACCIÓN INDIVIDUALES */}
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleShareNoteWhatsApp(consultation)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded border border-transparent hover:border-green-200 transition-colors"
                                                title="Enviar por WhatsApp"
                                            >
                                                <Share2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handlePrintNote(consultation)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-transparent hover:border-blue-200 transition-colors"
                                                title="Descargar PDF"
                                            >
                                                <Download size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <FormattedText content={consultation.summary} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Panel de Galería (Derecha - Slide Over) */}
                {isGalleryOpen && (
                    <div className="w-full md:w-[400px] border-l dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-slide-in-right absolute right-0 h-full z-20 flex flex-col">
                        <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
                            <h4 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                <Paperclip size={16}/> Archivos del Paciente
                            </h4>
                            <button onClick={() => setIsGalleryOpen(false)} className="md:hidden p-1 text-slate-400"><X size={16}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            {/* Reutilizamos la galería filtrada por ID */}
                            <DoctorFileGallery patientId={viewingPatient.id} />
                        </div>
                    </div>
                )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECETA RÁPIDA (Existente) */}
      {selectedPatientForRx && doctorProfile && (
        <QuickRxModal
          isOpen={!!selectedPatientForRx}
          onClose={() => setSelectedPatientForRx(null)}
          initialTranscript=""
          patientName={selectedPatientForRx.name}
          doctorProfile={doctorProfile}
        />
      )}
    </div>
  );
};

export default PatientsView;