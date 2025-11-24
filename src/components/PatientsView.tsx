import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';
import { toast } from 'sonner';
import { Plus, Search, Phone, Calendar, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User, X, FileText, Printer, Share2, Send } from 'lucide-react';
import { PatientAttachments } from './PatientAttachments';
import PrescriptionPDF from './PrescriptionPDF';
import { pdf } from '@react-pdf/renderer';
import FormattedText from './FormattedText';

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // --- ESTADOS PARA HISTORIAL (RESTAURADOS) ---
  const [history, setHistory] = useState<Consultation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

  // --- ESTADOS DE TABLA INTELIGENTE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Patient; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  // Cargar historial cuando se selecciona un paciente
  useEffect(() => {
      if (selectedPatient) {
          fetchHistory(selectedPatient.id);
      }
  }, [selectedPatient]);

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setDoctorProfile(data);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Error al cargar pacientes');
    else setPatients(data || []);
    setLoading(false);
  };

  const fetchHistory = async (patientId: string) => {
    setLoadingHistory(true);
    const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
    
    if (error) toast.error("Error cargando historial");
    else setHistory(data || []);
    setLoadingHistory(false);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return toast.error("Nombre obligatorio");
    setIsSaving(true);
    const { data, error } = await supabase.from('patients').insert([{...newPatient, doctor_id: (await supabase.auth.getUser()).data.user?.id }]).select();
    setIsSaving(false);
    if (error) {
        toast.error('Error al crear: ' + error.message);
    } else {
        toast.success('Paciente creado');
        setPatients([data[0], ...patients]);
        setIsModalOpen(false);
        setNewPatient({ name: '', phone: '' });
    }
  };

  const handleDeletePatient = async (id: string) => {
      if(!confirm("¿Eliminar paciente y todo su historial?")) return;
      try {
          await supabase.from('patients').delete().eq('id', id);
          toast.success("Eliminado");
          setPatients(patients.filter(p => p.id !== id));
          setSelectedPatient(null);
      } catch (e) { toast.error("Error al eliminar"); }
  };

  // --- PDF & COMPARTIR ---
  const generatePdfBlob = async (consultation: Consultation) => {
      if (!selectedPatient || !doctorProfile) return null;
      return await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty}
            license={doctorProfile.license_number} phone={doctorProfile.phone}
            university={doctorProfile.university} address={doctorProfile.address}
            logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url}
            patientName={selectedPatient.name} date={new Date(consultation.created_at).toLocaleDateString()}
            content={consultation.summary || "Sin contenido"}
        />
      ).toBlob();
  };

  const handlePrint = async (consultation: Consultation) => {
      const blob = await generatePdfBlob(consultation);
      if(blob) window.open(URL.createObjectURL(blob), '_blank');
  };

  const handleWhatsApp = async (consultation: Consultation) => {
      if(!selectedPatient) return;
      const blob = await generatePdfBlob(consultation);
      if(blob) {
          const file = new File([blob], `Receta-${selectedPatient.name}.pdf`, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'Receta Médica' });
          } else {
              toast.error("Dispositivo no soporta compartir directo.");
          }
      }
  };

    const processedPatients = useMemo(() => {
        let result = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.phone && p.phone.includes(searchTerm)));
        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [patients, searchTerm, sortConfig]);

    const totalPages = Math.ceil(processedPatients.length / itemsPerPage);
    const paginatedPatients = processedPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSort = (key: keyof Patient) => {
        setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    };

    const getSortIcon = (key: keyof Patient) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-brand-teal"/> : <ChevronDown size={14} className="text-brand-teal"/>;
    };

  // --- VISTA DETALLE (CON HISTORIAL RESTAURADO) ---
  if (selectedPatient) {
      return (
          <div className="p-6 h-[calc(100vh-64px)] overflow-y-auto animate-fade-in-up bg-slate-50 dark:bg-slate-900">
              <button onClick={() => setSelectedPatient(null)} className="mb-4 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-brand-teal font-bold transition-colors"><ChevronLeft size={20} /> Volver al Directorio</button>
              
              {/* HEADER PACIENTE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-2xl border-2 border-brand-teal/20">
                          {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedPatient.name}</h2>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                              {selectedPatient.phone && <span className="flex items-center gap-1"><Phone size={14} /> {selectedPatient.phone}</span>}
                              <span className="flex items-center gap-1"><Calendar size={14} /> Reg: {new Date(selectedPatient.created_at).toLocaleDateString()}</span>
                          </div>
                      </div>
                  </div>
                   <button onClick={() => handleDeletePatient(selectedPatient.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold border border-transparent hover:border-red-200 dark:hover:border-red-800">Eliminar Paciente</button>
              </div>

              {/* MÓDULO DE ADJUNTOS */}
              <div className="mb-8">
                <PatientAttachments patientId={selectedPatient.id} />
              </div>

              {/* --- HISTORIAL DE CONSULTAS (RESTAURADO) --- */}
              <div className="mt-8">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="text-brand-teal"/> Historial de Consultas ({history.length})
                  </h3>
                  
                  {loadingHistory ? (
                      <div className="text-center py-8 text-slate-400">Cargando historial...</div>
                  ) : history.length === 0 ? (
                      <div className="text-center py-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">No hay consultas registradas aún.</div>
                  ) : (
                      <div className="space-y-4">
                          {history.map((consultation) => (
                              <div key={consultation.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                  <div className="bg-slate-50 dark:bg-slate-700/30 p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                      <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                          <Calendar size={16} className="text-brand-teal"/>
                                          {new Date(consultation.created_at).toLocaleDateString()}
                                          <span className="text-xs font-normal text-slate-400 ml-2">{new Date(consultation.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => handleWhatsApp(consultation)} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 transition-colors text-xs font-bold flex items-center gap-1"><Send size={14}/> WhatsApp</button>
                                          <button onClick={() => handlePrint(consultation)} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 transition-colors text-xs font-bold flex items-center gap-1"><Printer size={14}/> PDF</button>
                                      </div>
                                  </div>
                                  <div className="p-5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                      <FormattedText content={consultation.summary || "Sin notas disponibles."} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900 animate-fade-in-up overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Directorio de Pacientes</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gestione sus expedientes clínicos ({patients.length} total).</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-brand-teal text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-teal-600 transition-all active:scale-95">
          <Plus size={20} /> Nuevo Paciente
        </button>
      </div>

      <div className="mb-4 shrink-0 relative">
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 bg-white dark:bg-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-brand-teal transition-all">
            <Search className="text-slate-400 mr-3" size={20} />
            <input type="text" placeholder="Buscar..." className="flex-1 outline-none text-slate-700 dark:text-slate-200 bg-transparent placeholder:text-slate-400 text-sm font-medium" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-medium animate-pulse">Cargando directorio...</div>
          ) : processedPatients.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                <Search size={30} className="text-slate-300 dark:text-slate-500 mb-2"/>
                <p>No se encontraron pacientes.</p>
              </div>
          ) : (
              <>
                <div className="flex-1 overflow-auto md:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                            <tr>
                                <th onClick={() => handleSort('name')} className="p-4 cursor-pointer group hover:text-brand-teal transition-colors select-none"><div className="flex items-center gap-2">Paciente {getSortIcon('name')}</div></th>
                                <th className="p-4 select-none hidden md:table-cell">Contacto</th>
                                <th onClick={() => handleSort('created_at')} className="p-4 cursor-pointer group hover:text-brand-teal transition-colors select-none hidden sm:table-cell"><div className="flex items-center gap-2">Registro {getSortIcon('created_at')}</div></th>
                                <th className="p-4 text-center w-24 select-none">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {paginatedPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-sm border border-brand-teal/20 shrink-0">
                                                {patient.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white truncate max-w-[150px] sm:max-w-none">{patient.name}</p>
                                                {patient.phone && <p className="text-xs text-slate-500 dark:text-slate-400 md:hidden flex items-center gap-1 mt-0.5"><Phone size={10}/> {patient.phone}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">{patient.phone || <span className="text-slate-400 italic">Sin teléfono</span>}</td>
                                    <td className="p-4 hidden sm:table-cell"><span className="text-sm">{new Date(patient.created_at).toLocaleDateString()}</span></td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => setSelectedPatient(patient)} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-brand-teal hover:text-white transition-all shadow-sm active:scale-95"><Eye size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between shrink-0 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Página {currentPage} de {totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft size={18}/></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight size={18}/></button>
                    </div>
                </div>
              </>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><User className="text-brand-teal" size={20}/> Registrar Paciente</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                <input type="text" required className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-teal dark:text-white font-medium transition-all" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} placeholder="Ej. Juan Pérez"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input type="tel" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-teal dark:text-white font-medium transition-all" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} placeholder="Ej. 55 1234 5678"/>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 shadow-lg disabled:opacity-50 transition-all mt-2 flex justify-center items-center gap-2 active:scale-95">
                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Plus size={20}/> Registrar</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsView;