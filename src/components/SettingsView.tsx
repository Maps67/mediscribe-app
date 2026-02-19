import React, { useState, useEffect } from 'react';
import { Save, User, Stethoscope, Hash, Phone, MapPin, BookOpen, Download, FileSpreadsheet, ShieldCheck, Database, QrCode, PenTool, Image as ImageIcon, Lock, Camera, Calendar, Link2, Server, Fingerprint, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MedicalDataService } from '../services/MedicalDataService';
import { toast } from 'sonner';
import PatientImporter from './PatientImporter'; 
import { ImageUploader } from '../components/ui/ImageUploader';

// LISTA MAESTRA DE ESPECIALIDADES (NORMALIZACIÓN)
const SPECIALTIES = [
  "Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna", "Cirugía de Mano", 
  "Cirugía Oncológica", "Cirugía Pediátrica", "Cirugía Plástica y Reconstructiva", "Dermatología", 
  "Endocrinología", "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", "Medicina del Deporte", 
  "Medicina Interna", "Nefrología", "Neumología", "Neurocirugía", "Neurología", "Oftalmología", 
  "Otorrinolaringología", "Pediatría", "Psiquiatría", "Reumatología", "Traumatología y Ortopedia", 
  "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"
];

const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false); 
  const [showImporter, setShowImporter] = useState(false);
  
  // Datos Reales del Sistema (Auditoría)
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [lastSignIn, setLastSignIn] = useState<string>('');

  // Campos del formulario (Datos Texto)
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Nuevo Estado: Sincronización de Agenda
  const [calendarUrl, setCalendarUrl] = useState('');

  // Campos de Activos Visuales (Imágenes)
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // SET DATOS REALES DE AUDITORÍA
      setUserId(user.id);
      setUserEmail(user.email || 'No registrado');
      setLastSignIn(user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Primera Sesión');

      const { data } = await supabase
        .from('profiles') 
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setSpecialty(data.specialty || 'Medicina General');
        setLicense(data.license_number || '');
        setPhone(data.phone || '');
        setUniversity(data.university || '');
        setAddress(data.address || '');
        setWebsiteUrl(data.website_url || '');
        
        // Cargar URL de calendario externo
        setCalendarUrl(data.external_calendar_url || '');

        setLogoUrl(data.logo_url || '');
        setSignatureUrl(data.signature_url || '');
        setQrCodeUrl(data.qr_code_url || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      toast.error("Error al cargar datos del perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSmartUpload = async (file: File, type: 'logo' | 'signature' | 'qr' | 'avatar') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión de usuario");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(fileName);

      if (type === 'logo') setLogoUrl(publicUrl);
      else if (type === 'signature') setSignatureUrl(publicUrl);
      else if (type === 'qr') setQrCodeUrl(publicUrl);
      else if (type === 'avatar') setAvatarUrl(publicUrl);

      toast.success("Imagen cargada. Recuerde 'Guardar Cambios' para confirmar.");

    } catch (error) {
      console.error(`Error subiendo ${type}:`, error);
      toast.error("Error al subir la imagen. Verifique su conexión.");
    }
  };

  const updateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");

      const updates = {
        id: user.id,
        full_name: fullName,
        specialty,
        specialty_text: specialty, 
        license_number: license,
        phone,
        university,
        address,
        website_url: websiteUrl,
        external_calendar_url: calendarUrl,
        logo_url: logoUrl,
        signature_url: signatureUrl,
        qr_code_url: qrCodeUrl,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if(!confirm("¿Desea descargar una copia completa de sus pacientes y consultas en formato Excel (CSV)?")) return;
    setDownloading(true);
    try {
      if (typeof MedicalDataService.downloadFullBackup === 'function') {
          const success = await MedicalDataService.downloadFullBackup();
          if(success) toast.success("Respaldo descargado correctamente.");
          else toast.info("No hay datos para respaldar aún.");
      } else {
          toast.error("Función de respaldo no disponible aún.");
      }
    } catch(e) {
      toast.error("Error al generar respaldo.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando perfil...</div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto relative">

      {/* --- INTEGRACIÓN DEL IMPORTADOR --- */}
      {showImporter && (
          <PatientImporter 
            onComplete={() => {}} 
            onClose={() => setShowImporter(false)}
          />
      )}

      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Datos del consultorio, identidad y seguridad.</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => setShowImporter(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors text-sm font-bold"
            >
                <Database size={16}/> <span className="hidden sm:inline">Importar</span>
            </button>

            <button 
                onClick={handleBackup}
                disabled={downloading}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors text-sm font-bold disabled:opacity-50"
            >
                {downloading ? <Download className="animate-bounce" size={16}/> : <FileSpreadsheet size={16}/>}
                <span className="truncate">{downloading ? "..." : "Respaldo"}</span>
            </button>
          </div>
      </div>
      
      <form onSubmit={updateProfile} className="space-y-8">
        
        {/* --- SECCIÓN 1: DATOS DE TEXTO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Tarjeta: Identidad */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <User size={18} className="text-brand-teal"/> Identidad Profesional
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nombre Completo</label>
                        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none dark:bg-slate-900 dark:text-white" placeholder="Dr. Juan Pérez" />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Especialidad</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed">
                            <Stethoscope size={16} className="text-slate-400 mr-2 pointer-events-none"/>
                            <select
                                value={specialty}
                                disabled={true} 
                                className="w-full py-3 outline-none bg-transparent dark:text-slate-400 text-slate-500 appearance-none cursor-not-allowed font-medium"
                            >
                                {SPECIALTIES.map(s => (
                                    <option key={s} value={s} className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <Lock size={14} className="text-slate-400 ml-2" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 pl-1">
                            Dato vinculado a Cédula. No editable.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cédula Prof.</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <Hash size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={license} onChange={e => setLicense(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="12345678" />
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Universidad / Institución</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <BookOpen size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={university} onChange={e => setUniversity(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="Ej. UNAM" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta: Contacto */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <MapPin size={18} className="text-brand-teal"/> Contacto y Ubicación
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Teléfono</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                                <Phone size={16} className="text-slate-400 mr-2"/>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="55 1234 5678" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Sitio Web</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                                <BookOpen size={16} className="text-slate-400 mr-2"/>
                                <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="https://misitio.com" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dirección Completa</label>
                        <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none resize-none dark:bg-slate-900 dark:text-white" placeholder="Calle, Número, Colonia, CP..." />
                    </div>
                </div>
            </div>
        </div>

        {/* --- SECCIÓN 1.5: AGENDA --- */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Calendar size={18} className="text-brand-teal"/> Sincronización de Agenda Externa
            </div>
            <div className="p-6">
                <div className="max-w-3xl">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        Enlace de Calendario (iCal / .ics)
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <Link2 size={16} className="text-slate-400 mr-2"/>
                            <input 
                                type="url" 
                                value={calendarUrl} 
                                onChange={(e) => setCalendarUrl(e.target.value)} 
                                className="w-full py-3 outline-none bg-transparent dark:text-white" 
                                placeholder="https://calendar.google.com/calendar/ical/..." 
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">TIP</span>
                        Pegue aquí la "Dirección secreta en formato iCal" de Google Calendar, iCloud o Outlook para visualizar sus eventos externos en la agenda.
                    </p>
                </div>
            </div>
        </div>

        {/* --- SECCIÓN 2: ACTIVOS DIGITALES --- */}
        <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <ImageIcon size={20} className="text-brand-teal" /> Activos Digitales (Recetas y Documentos)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ImageUploader 
                    label="Foto de Perfil"
                    imageSrc={avatarUrl}
                    onUpload={(file) => handleSmartUpload(file, 'avatar')}
                    helperText="Aparecerá en su Dashboard."
                    aspectRatio="square"
                    icon={<Camera size={18} className="text-brand-teal"/>}
                />
                <ImageUploader 
                    label="Logo Clínica"
                    imageSrc={logoUrl}
                    onUpload={(file) => handleSmartUpload(file, 'logo')}
                    helperText="Recomendado: PNG Transparente"
                    icon={<ImageIcon size={18} className="text-brand-teal"/>}
                />
                <ImageUploader 
                    label="Firma Autógrafa Digitalizada"
                    imageSrc={signatureUrl}
                    onUpload={(file) => handleSmartUpload(file, 'signature')}
                    helperText="Esta imagen se incrustará en los PDFs."
                    aspectRatio="wide"
                    icon={<PenTool size={18} className="text-brand-teal"/>}
                />
                <ImageUploader 
                    label="Código QR Receta"
                    imageSrc={qrCodeUrl}
                    onUpload={(file) => handleSmartUpload(file, 'qr')}
                    helperText="Suba su QR de Cédula o SAT."
                    aspectRatio="square"
                    icon={<QrCode size={18} className="text-brand-teal"/>}
                />
            </div>

            {/* --- SECCIÓN 3: EVIDENCIA TÉCNICA Y LEGAL (NOM-151) --- */}
            {/* CORRECCIÓN ESTRUCTURAL: Flex Column para asegurar orden y footer visible */}
            <div className="mt-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
                
                {/* HEAD: Título */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                            <Server size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base">
                                Seguridad de Infraestructura y Trazabilidad
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Datos técnicos de su cuenta activa en VitalScribe.
                            </p>
                        </div>
                    </div>
                    
                    {userId && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <CheckCircle2 size={12} className="mr-2"/>
                            CUENTA VERIFICADA
                        </span>
                    )}
                </div>

                {/* BODY: Columnas de Info */}
                <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                    {/* Columna Izquierda: Explicación Legal */}
                    <div className="space-y-3">
                        <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Lock size={14} className="text-slate-400"/> Responsabilidad del Usuario
                        </h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-justify">
                            El uso de esta cuenta para la generación de documentos médicos electrónicos implica la aceptación de los mecanismos de seguridad implementados por VitalScribe.
                        </p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mt-2 list-disc pl-4">
                            <li>Cada documento PDF generado recibe una marca de tiempo inmutable.</li>
                            <li>La cuenta está vinculada a un identificador único (UUID) que actúa como llave de auditoría.</li>
                            <li>Los activos digitales (firma) están protegidos bajo políticas RLS (Row Level Security).</li>
                        </ul>
                    </div>
                    
                    {/* Columna Derecha: DATOS REALES */}
                    <div className="bg-white dark:bg-black/20 rounded-lg border border-slate-200 dark:border-slate-800 p-4 font-mono text-xs shadow-inner">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/50 text-slate-400">
                            <Fingerprint size={14}/>
                            <span className="font-bold uppercase tracking-wider">Credenciales Técnicas</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase mb-1">UUID de Usuario (Immutable Key)</span>
                                <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded text-slate-700 dark:text-slate-300 break-all select-all">
                                    {userId || 'Cargando identificador...'}
                                </code>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase mb-1">Email Registrado</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-bold truncate block" title={userEmail}>
                                        {userEmail}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase mb-1">Última Sesión</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">
                                        {lastSignIn}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                                <span className="text-[10px] text-slate-400">Protocolo de Base de Datos</span>
                                <span className="text-[10px] text-brand-teal font-bold bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded">
                                    POSTGRESQL + RLS ACTIVADO
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER: Aviso de Privacidad INTEGRADO */}
                <div className="bg-amber-100 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800/50 px-6 py-4 flex gap-3 items-center mt-auto">
                    <ShieldCheck className="text-amber-700 shrink-0" size={18} />
                    <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                        <strong>Privacidad Garantizada:</strong> Sus datos están encriptados. Puede descargar una copia de seguridad completa (CSV) en cualquier momento usando el botón superior "Respaldo".
                    </p>
                </div>

            </div>
            
            {/* --- SOLUCIÓN FINAL AL SCROLL: ESPACIADOR FÍSICO --- */}
            {/* Este div invisible de 32 (128px) asegura que haya espacio al final */}
            <div className="h-32 w-full"></div>

        </div>

      </form>

      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 flex justify-center md:justify-end md:px-10">
         <button 
                onClick={(e) => updateProfile(e)}
                disabled={saving}
                className="w-full md:w-auto px-8 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Guardando...
                    </>
                ) : (
                    <>
                        <Save size={20} /> Guardar Cambios
                    </>
                )}
            </button>
      </div>
    </div>
  );
};

export default SettingsView;