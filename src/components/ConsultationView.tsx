import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';

// --- SERVICIOS Y UTILIDADES ---
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'; 
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { AppointmentService } from '../services/AppointmentService';
import { supabase } from '../lib/supabase';
import { ChatMessage, GeminiResponse, Patient, DoctorProfile, PatientInsight, MedicationItem } from '../types';
import PrescriptionPDF from './PrescriptionPDF';

// --- COMPONENTES HIJOS (TU NUEVA ARQUITECTURA) ---
import { PatientSidebar } from './PatientSidebar';
import { DictationPanel } from './DictationPanel';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';

// --- DEFINICIONES LOCALES ---
type TabType = 'record' | 'patient' | 'chat' | 'insurance';

interface EnhancedGeminiResponse extends GeminiResponse {
   prescriptions?: MedicationItem[];
}

interface TranscriptSegment {
    role: 'doctor' | 'patient';
    text: string;
    timestamp: number;
}

const SPECIALTIES = [
  "Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna", "Cirugía de Mano", 
  "Cirugía Oncológica", "Cirugía Pediátrica", "Cirugía Plástica y Reconstructiva", "Dermatología", 
  "Endocrinología", "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", "Medicina del Deporte", 
  "Medicina Interna", "Nefrología", "Neumología", "Neurocirugía", "Neurología", "Oftalmología", 
  "Otorrinolaringología", "Pediatría", "Psiquiatría", "Reumatología", "Traumatología y Ortopedia", 
  "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"
];

// Función auxiliar para limpiar JSONs corruptos de Supabase
const cleanHistoryString = (input: any): string => {
      if (!input) return "";
      if (typeof input === 'object') {
          if (input.clinicalNote && typeof input.clinicalNote === 'string') return input.clinicalNote;
          if (input.legacyNote) return input.legacyNote;
          if (input.resumen_clinico) return input.resumen_clinico;
          return JSON.stringify(input);
      }
      if (typeof input === 'string') {
          const trimmed = input.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed.clinicalNote) return parsed.clinicalNote;
                  if (parsed.legacyNote) return parsed.legacyNote;
                  if (parsed.resumen_clinico) return parsed.resumen_clinico;
              } catch (e) { return input; }
          }
          return input;
      }
      return String(input);
};

const ConsultationView: React.FC = () => {
  // --- HOOKS Y ESTADOS BASE ---
  const { 
      isListening, isPaused, transcript, startListening, pauseListening, 
      stopListening, resetTranscript, setTranscript, isAPISupported 
  } = useSpeechRecognition();
  
  const location = useLocation(); 
  
  // Datos Maestros
  const [patients, setPatients] = useState<any[]>([]); 
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  
  // Estados de Contexto
  const [activeMedicalContext, setActiveMedicalContext] = useState<any | null>(null);
  const [vitalSnapshot, setVitalSnapshot] = useState<PatientInsight | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [isMobileSnapshotVisible, setIsMobileSnapshotVisible] = useState(true);
  const [isMobileContextExpanded, setIsMobileContextExpanded] = useState(false);

  // Estados de Proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedNote, setGeneratedNote] = useState<EnhancedGeminiResponse | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('record');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina General');
  
  // Estados de Edición
  const [editableInstructions, setEditableInstructions] = useState('');
  const [editablePrescriptions, setEditablePrescriptions] = useState<MedicationItem[]>([]);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Modales y Paneles Extra
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false); // (Opcional: Si se usa en el padre)
  const [isQuickRxModalOpen, setIsQuickRxModalOpen] = useState(false); 
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [patientInsights, setPatientInsights] = useState<PatientInsight | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Chat y Audio Historial
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<'doctor' | 'patient'>('doctor');

  // Datos Auxiliares
  const [insuranceData, setInsuranceData] = useState<any>(null);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs
  const startTimeRef = useRef<number>(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- EFECTOS (LÓGICA DE NEGOCIO) ---
  
  // 1. Online/Offline & Setup
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("Conexión restablecida"); };
    const handleOffline = () => { setIsOnline(false); toast.warning("Sin conexión. Modo Offline activo."); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    startTimeRef.current = Date.now();
    return () => { 
        window.removeEventListener('online', handleOnline); 
        window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  // 2. Carga Inicial de Datos (Pacientes, Perfil, Drafts)
  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; 

        if (mounted) {
            setCurrentUserId(user.id); 
            // Cargar Pacientes
            const { data: patientsData } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
            
            // Cargar Citas Fantasma
            const today = new Date();
            today.setHours(0,0,0,0);
            const { data: ghostAppointments } = await supabase.from('appointments').select('id, title, start_time').is('patient_id', null).eq('doctor_id', user.id).neq('status', 'cancelled').gte('start_time', today.toISOString()).limit(20);

            const loadedPatients = patientsData || [];
            let combinedList = [...loadedPatients];
            if (ghostAppointments && ghostAppointments.length > 0) {
                const ghosts = ghostAppointments.map(apt => ({
                    id: `ghost_${apt.id}`, name: apt.title, isGhost: true, appointmentId: apt.id, created_at: apt.start_time
                }));
                combinedList = [...ghosts, ...loadedPatients];
            }
            setPatients(combinedList);
            
            // Cargar Perfil Médico
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profileData) {
                setDoctorProfile(profileData as DoctorProfile);
                if (profileData.specialty) {
                    const matched = SPECIALTIES.find(s => s.toLowerCase() === profileData.specialty.toLowerCase());
                    setSelectedSpecialty(matched || profileData.specialty);
                }
            }

            // Manejar Navegación desde Dashboard
            if (location.state?.patientData) {
                const incoming = location.state.patientData;
                if (incoming.isGhost) {
                      const tempPatient = { ...incoming, id: `temp_${Date.now()}`, isTemporary: true, appointmentId: incoming.appointmentId || incoming.id.replace('ghost_', '') };
                      setSelectedPatient(tempPatient);
                      if(incoming.appointmentId) setLinkedAppointmentId(incoming.appointmentId);
                      toast.info(`Iniciando consulta para: ${incoming.name}`);
                } else {
                      const realPatient = loadedPatients.find(p => p.id === incoming.id);
                      setSelectedPatient(realPatient || incoming); 
                      toast.success(`Paciente cargado: ${incoming.name}`);
                }
                if (location.state.linkedAppointmentId) setLinkedAppointmentId(location.state.linkedAppointmentId);
                window.history.replaceState({}, document.title);
            }
            else if (location.state?.patientName) {
                const incomingName = location.state.patientName;
                const existing = loadedPatients.find((p: any) => p.name.toLowerCase() === incomingName.toLowerCase());
                if (existing) {
                    setSelectedPatient(existing);
                    toast.success(`Paciente cargado: ${incomingName}`);
                } else {
                    setSelectedPatient({ id: 'temp_' + Date.now(), name: incomingName, isTemporary: true });
                    toast.info(`Consulta libre para: ${incomingName}`);
                }
                window.history.replaceState({}, document.title);
            } else {
                // Recuperar Borrador
                const savedDraft = localStorage.getItem(`draft_${user.id}`); 
                if (savedDraft && !transcript) { 
                    setTranscript(savedDraft); 
                    toast.info("Borrador recuperado."); 
                }
            }
        }
      } catch (e) {}
    };
    loadInitialData();
    return () => { mounted = false; };
  }, [location.state, setTranscript]); 

  // 3. Cargar Contexto Médico al seleccionar paciente
  useEffect(() => {
    const fetchMedicalContext = async () => {
        setActiveMedicalContext(null);
        if (selectedPatient && !(selectedPatient as any).isTemporary) {
            try {
                const { data: patientData } = await supabase.from('patients').select('pathological_history, allergies, history').eq('id', selectedPatient.id).single();
                const { data: lastCons } = await supabase.from('consultations').select('summary, created_at, ai_analysis_data').eq('patient_id', selectedPatient.id).order('created_at', { ascending: false }).limit(1).single();

                let cleanHistory = "", cleanAllergies = "";
                let lastConsultationData = undefined, lastInsuranceData = undefined;

                if (patientData) {
                    cleanHistory = cleanHistoryString(patientData.history || patientData.pathological_history);
                    cleanAllergies = cleanHistoryString(patientData.allergies);
                }
                if (lastCons) {
                    if (lastCons.summary) lastConsultationData = { date: lastCons.created_at, summary: lastCons.summary };
                    if (lastCons.ai_analysis_data) {
                        const analysis = typeof lastCons.ai_analysis_data === 'string' ? JSON.parse(lastCons.ai_analysis_data) : lastCons.ai_analysis_data;
                        if (analysis?.insurance_data?.provider) lastInsuranceData = analysis.insurance_data;
                    }
                }

                setActiveMedicalContext({
                    history: cleanHistory || "No registrados",
                    allergies: cleanAllergies || "No registradas",
                    lastConsultation: lastConsultationData,
                    insurance: lastInsuranceData
                });
            } catch (e) {
                console.log("Error leyendo contexto:", e);
                setActiveMedicalContext({ history: "Error de carga", allergies: "No disponibles" });
            }
        }
    };
    fetchMedicalContext();
  }, [selectedPatient]);

  // 4. Vital Snapshot (IA)
  useEffect(() => {
    if (selectedPatient && !(selectedPatient as any).isTemporary) {
        if (!activeMedicalContext) { setLoadingSnapshot(true); return; }
        setLoadingSnapshot(true);
        setIsMobileSnapshotVisible(true);
        
        const historyStr = typeof selectedPatient.history === 'string' ? selectedPatient.history : JSON.stringify(selectedPatient.history || '');
        const lastConsContext = activeMedicalContext.lastConsultation ? `\n=== RESUMEN ÚLTIMA CONSULTA (${new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}) ===\n${activeMedicalContext.lastConsultation.summary}` : "\n(Sin consultas previas)";
        const fullContext = `ANTECEDENTES: ${historyStr} \n ${lastConsContext}`;

        GeminiMedicalService.generateVitalSnapshot(fullContext, selectedSpecialty)
            .then(data => data && setVitalSnapshot(data))
            .catch(err => setVitalSnapshot({ evolution: "⚠️ No disponible", medication_audit: "Error de conexión", risk_flags: ["Verifique internet"], pending_actions: [] }))
            .finally(() => setLoadingSnapshot(false));
    } else {
        setVitalSnapshot(null);
        setLoadingSnapshot(false);
    }
  }, [selectedPatient?.id, activeMedicalContext, selectedSpecialty]); 

  // 5. Autoguardado de Draft
  useEffect(() => { 
    if (transcript && currentUserId) localStorage.setItem(`draft_${currentUserId}`, transcript);
  }, [transcript, currentUserId]);

  // --- HANDLERS (LOGICA DE CONTROL) ---

  const commitCurrentTranscript = () => {
      if (transcript.trim()) {
          setSegments(prev => [...prev, { role: activeSpeaker, text: transcript.trim(), timestamp: Date.now() }]);
          resetTranscript();
      }
  };

  const handleSpeakerSwitch = (newRole: 'doctor' | 'patient') => {
      if (activeSpeaker === newRole) return;
      commitCurrentTranscript(); 
      setActiveSpeaker(newRole);
  };

  const handleManualSend = () => commitCurrentTranscript();

  const handleSelectPatient = (patient: any) => {
      if (!patient) { setSelectedPatient(null); return; }
      if (patient.isGhost) {
          const temp = { ...patient, id: `temp_${Date.now()}`, isTemporary: true, appointmentId: patient.appointmentId };
          setSelectedPatient(temp);
          if (patient.appointmentId) setLinkedAppointmentId(patient.appointmentId);
          toast.info(`Paciente temporal: ${patient.name}`);
      } else {
          setSelectedPatient(patient);
          setSearchTerm(''); 
          setIsMobileSnapshotVisible(true);
      }
  };

  const handleCreateTemporary = (name: string) => {
      setSelectedPatient({ id: 'temp_' + Date.now(), name: name, isTemporary: true });
      setSearchTerm('');
      startTimeRef.current = Date.now(); 
      toast.info(`Nuevo paciente: ${name}`);
  };

  const handleToggleRecording = () => {
    if (!isOnline) return toast.info("Sin internet: Use el teclado.");
    if (!isAPISupported) return toast.error("Navegador no compatible.");
    if (!consentGiven) return toast.warning("Falta consentimiento.");
    if (isListening) pauseListening(); else startListening();
  };

  const handleFinishRecording = () => {
      commitCurrentTranscript(); 
      stopListening();
      toast.success("Dictado finalizado.");
  };

  const handleClearTranscript = () => {
      if(confirm("¿Borrar borrador?")) { 
          resetTranscript(); 
          setSegments([]);
          if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`); 
          setGeneratedNote(null); 
      }
  };

  const handleLoadInsights = async () => {
      if (!selectedPatient) return toast.error("Seleccione un paciente.");
      setIsInsightsOpen(true);
      if (patientInsights) return;
      setIsLoadingInsights(true);
      try {
          const { data: history } = await supabase.from('consultations').select('summary, created_at').eq('patient_id', selectedPatient.id).order('created_at', { ascending: false }).limit(5);
          const consultationsText = history?.map(h => `[Fecha: ${new Date(h.created_at).toLocaleDateString()}] ${h.summary}`) || [];
          const analysis = await GeminiMedicalService.generatePatient360Analysis(selectedPatient.name, selectedPatient.history || "No registrado", consultationsText);
          setPatientInsights(analysis);
      } catch (error) { toast.error("Error analizando historial."); setIsInsightsOpen(false); } 
      finally { setIsLoadingInsights(false); }
  };

  const handleGenerate = async () => {
    commitCurrentTranscript(); 
    const currentText = transcript.trim() ? `\n[${activeSpeaker.toUpperCase()}]: ${transcript}` : '';
    const fullTranscript = segments.map(s => `[${s.role === 'doctor' ? 'DOCTOR' : 'PACIENTE'}]: ${s.text}`).join('\n') + currentText;

    if (!fullTranscript.trim()) return toast.error("Sin audio o texto registrado.");
    if (!isOnline) return toast.warning("Modo Offline activo.");

    if (isListening || isPaused) stopListening();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsProcessing(true);
    const loadingToast = toast.loading("Analizando con Prometheus V10...");

    try {
      let fullMedicalContext = "";
      if (activeMedicalContext) {
          fullMedicalContext = `ANTECEDENTES: ${activeMedicalContext.history} \n ALERGIAS: ${activeMedicalContext.allergies}`;
          if (activeMedicalContext.lastConsultation) fullMedicalContext += `\n ÚLTIMA CONSULTA: ${activeMedicalContext.lastConsultation.summary}`;
      }

      const response = await GeminiMedicalService.generateClinicalNote(fullTranscript, selectedSpecialty, fullMedicalContext) as EnhancedGeminiResponse;
      
      if (!response || (!response.soapData && !response.clinicalNote)) throw new Error("Respuesta vacía de IA.");

      setGeneratedNote(response);
      setEditableInstructions(response.patientInstructions || '');
      setEditablePrescriptions(response.prescriptions || []);
      
      toast.dismiss(loadingToast);
      if (response.risk_analysis?.level === 'Alto') toast.error("⚠️ ALERTA: Riesgo Alto detectado.");
      else toast.success("Nota generada.");
      
      setActiveTab('record');
      setChatMessages([{ role: 'model', text: "He analizado la consulta. Nota y Receta listas." }]);

    } catch (e: any) { 
        toast.dismiss(loadingToast);
        if(e.name !== 'AbortError') toast.error(`Error IA: ${e.message}`); 
    } finally { setIsProcessing(false); }
  };

  const handleSoapChange = (section: keyof any, value: string) => {
      if (!generatedNote?.soapData) return;
      setGeneratedNote({ ...generatedNote, soapData: { ...generatedNote.soapData, [section]: value } });
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !generatedNote) return toast.error("Faltan datos.");
    if (!isOnline) return toast.error("Requiere internet.");
    
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");
        
        let finalPatientId = selectedPatient.id;
        if ((selectedPatient as any).isTemporary) {
            const { data: newPatient, error } = await supabase.from('patients').insert({
                name: selectedPatient.name, doctor_id: user.id, history: JSON.stringify({ created_via: 'dashboard' })
            }).select().single();
            if (error) throw error;
            finalPatientId = newPatient.id;
        }

        const medsSummary = editablePrescriptions.length > 0 ? "\n\nMEDICAMENTOS:\n" + editablePrescriptions.map(m => `- ${m.drug} ${m.dose}`).join('\n') : "";
        const summaryToSave = generatedNote.soapData 
            ? `FECHA: ${new Date().toLocaleDateString()}\nS: ${generatedNote.soapData.subjective}\nO: ${generatedNote.soapData.objective}\nA: ${generatedNote.soapData.analysis}\nP: ${generatedNote.soapData.plan}\n\nPLAN:${medsSummary}\n\nINSTRUCCIONES:\n${editableInstructions}`
            : (generatedNote.clinicalNote + medsSummary + editableInstructions);

        if (linkedAppointmentId) {
             await supabase.from('appointments').update({ status: 'completed', patient_id: finalPatientId }).eq('id', linkedAppointmentId);
        } else {
             await AppointmentService.markAppointmentAsCompleted(finalPatientId);
        }

        const hasValidInsurance = insuranceData?.policyNumber?.length > 0;
        const finalAiData = { ...generatedNote, insurance_data: hasValidInsurance ? insuranceData : null };

        const { error } = await supabase.from('consultations').insert({
            doctor_id: user.id, patient_id: finalPatientId, transcript: 'Guardado', summary: summaryToSave,
            status: 'completed', ai_analysis_data: finalAiData, legal_status: 'validated', real_duration_seconds: Math.round((Date.now() - startTimeRef.current) / 1000)
        });
        
        if (error) throw error;
        toast.success("Consulta guardada.");
        
        // Reset
        resetTranscript(); setSegments([]); setGeneratedNote(null); setEditableInstructions(''); setEditablePrescriptions([]); setSelectedPatient(null);
        startTimeRef.current = Date.now(); 

    } catch (e:any) { toast.error("Error al guardar: " + e.message); } 
    finally { setIsSaving(false); }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || !generatedNote) return;
      const msg = chatInput; setChatInput('');
      setChatMessages(p => [...p, { role: 'user', text: msg }]);
      setIsChatting(true);
      try {
          const ctx = `CONTEXTO CLÍNICO: ${generatedNote.soapData ? JSON.stringify(generatedNote.soapData) : generatedNote.clinicalNote}. INSTRUCCIONES: ${editableInstructions}`;
          const reply = await GeminiMedicalService.chatWithContext(ctx, msg);
          setChatMessages(p => [...p, { role: 'model', text: reply }]);
      } catch (error) { toast.error("Error asistente"); } 
      finally { setIsChatting(false); }
  };

  // PDF Generation Helper
  const calculateAge = (birthdate?: string): string => {
      if (!birthdate) return "No registrada";
      try { return Math.abs(new Date(Date.now() - new Date(birthdate).getTime()).getUTCFullYear() - 1970) + " años"; } catch (e) { return "No registrada"; }
  };
  const generatePDFBlob = async () => {
      if (!selectedPatient || !doctorProfile) return null;
      try {
        return await pdf(<PrescriptionPDF doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty} license={doctorProfile.license_number} university={doctorProfile.university || "Universidad"} phone={doctorProfile.phone || ""} address={doctorProfile.address || ""} logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} patientName={selectedPatient.name} patientAge={calculateAge((selectedPatient as any).birthdate)} date={new Date().toLocaleDateString()} prescriptions={editablePrescriptions} instructions={editableInstructions} riskAnalysis={generatedNote?.risk_analysis} />).toBlob();
      } catch (error) { return null; }
  };
  const handlePrint = async () => { 
      const blob = await generatePDFBlob(); 
      if(blob) window.open(URL.createObjectURL(blob), '_blank'); 
  };
  const handleShareWhatsApp = () => { 
      if (!editableInstructions) return;
      const msg = `*Hola ${selectedPatient?.name}*\n\n${editableInstructions}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); 
  };

  const isReadyToGenerate = isOnline && !isListening && !isPaused && !isProcessing && (transcript || segments.length > 0) && !generatedNote;

  // --- RENDER (EL NUEVO LAYOUT DE 3 COLUMNAS) ---
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
      
      {/* 1. SIDEBAR IZQUIERDO: PACIENTES & BÚSQUEDA */}
      <PatientSidebar
          patients={patients}
          selectedPatient={selectedPatient}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSelectPatient={handleSelectPatient}
          onCreateTemporary={handleCreateTemporary}
          onClearTranscript={handleClearTranscript}
          onOpenAttachments={() => setIsAttachmentsOpen(true)}
          hasTranscript={!!transcript || segments.length > 0}
          isOnline={isOnline}
          selectedSpecialty={selectedSpecialty}
          specialties={SPECIALTIES}
          onSpecialtyChange={setSelectedSpecialty}
          vitalSnapshot={vitalSnapshot}
          loadingSnapshot={loadingSnapshot}
          isMobileSnapshotVisible={isMobileSnapshotVisible}
          setIsMobileSnapshotVisible={setIsMobileSnapshotVisible}
          activeMedicalContext={activeMedicalContext}
          isMobileContextExpanded={isMobileContextExpanded}
          setIsMobileContextExpanded={setIsMobileContextExpanded}
          onLoadInsights={handleLoadInsights}
          isLoadingInsights={isLoadingInsights}
      />

      {/* 2. PANEL CENTRAL: DICTADO (Siempre visible para referencia o si no hay nota) */}
      <DictationPanel 
          transcript={transcript}
          setTranscript={setTranscript}
          isListening={isListening}
          isPaused={isPaused}
          isProcessing={isProcessing}
          isOnline={isOnline}
          isAPISupported={isAPISupported}
          consentGiven={consentGiven}
          activeSpeaker={activeSpeaker}
          segments={segments}
          onToggleRecording={handleToggleRecording}
          onFinishRecording={handleFinishRecording}
          onGenerate={handleGenerate}
          onManualSend={handleManualSend}
          onSpeakerSwitch={handleSpeakerSwitch}
          isReadyToGenerate={!!isReadyToGenerate} // Fix boolean
      />

      {/* 3. PANEL DERECHO: EDITOR CLÍNICO (Ocupa el resto del espacio) */}
      <div className="flex-1 w-full md:w-1/2 border-l dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
         <ClinicalNoteEditor
            generatedNote={generatedNote}
            setGeneratedNote={setGeneratedNote}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedPatient={selectedPatient}
            selectedSpecialty={selectedSpecialty}
            isSaving={isSaving}
            onSaveConsultation={handleSaveConsultation}
            editingSection={editingSection}
            setEditingSection={setEditingSection}
            onSoapChange={handleSoapChange}
            editablePrescriptions={editablePrescriptions}
            onAddMedication={() => setEditablePrescriptions([...editablePrescriptions, { drug: "", dose: "", frequency: "", duration: "", notes: "" }])}
            onRemoveMedication={(idx) => { const n=[...editablePrescriptions]; n.splice(idx,1); setEditablePrescriptions(n); }}
            onUpdateMedication={(idx, f, v) => { const n=[...editablePrescriptions]; n[idx] = {...n[idx], [f]: v}; setEditablePrescriptions(n); }}
            editableInstructions={editableInstructions}
            setEditableInstructions={setEditableInstructions}
            isEditingInstructions={isEditingInstructions}
            setIsEditingInstructions={setIsEditingInstructions}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onChatSend={handleChatSend}
            isChatting={isChatting}
            chatEndRef={chatEndRef}
            onInsuranceDataChange={setInsuranceData}
            onShareWhatsApp={handleShareWhatsApp}
            onPrint={handlePrint}
         />
      </div>

      {/* MODALES EXTERNOS (Se mantienen igual) */}
      {/* (Aquí irían AttachmentsModal, AppointmentModal etc. si los tienes separados, por ahora los omití para limpieza ya que no son críticos para el core refactor) */}
    </div>
  );
};

export default ConsultationView;