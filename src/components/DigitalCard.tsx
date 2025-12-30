import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Share2, Users, Clock, FileText, 
  Search, BookOpen, Activity, Globe, 
  ExternalLink, Download, 
  Calendar, Stethoscope, Briefcase,
  ShieldCheck, FileCheck, AlertTriangle
} from 'lucide-react';

// IMPORTACIÓN DE MÓDULOS
import { InteractiveClinicalCase } from './InteractiveClinicalCase';
import { MedicalCalculators } from './MedicalCalculators';
import { QuickNotes } from './QuickNotes'; 

// --- TIPOS ---
interface UserProfile {
  full_name: string;
  specialty: string;
  phone?: string;
  license_number?: string;
  logo_url?: string;
  website_url?: string;
  address?: string;
  university?: string;
  [key: string]: any;
}

const generateVCard = (profile: UserProfile | null) => {
    if (!profile) return;
    const safeName = profile.full_name || 'Doctor';
    const safeParts = safeName.split(' ');
    const lastName = safeParts.length > 1 ? safeParts.pop() : '';
    const firstName = safeParts.join(' ');

    const vCardData = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:Dr. ${safeName}`,
        `N:${lastName};${firstName};Dr.;;`,
        `ORG:MediScribe AI - ${profile.university || 'Consultorio Privado'}`,
        `TITLE:${profile.specialty || 'Medicina General'}`,
        `TEL;TYPE=CELL:${profile.phone || ''}`,
        `URL:${profile.website_url || ''}`,
        `ADR;TYPE=WORK:;;${profile.address || ''};;;;`,
        `NOTE:Cédula Profesional: ${profile.license_number || 'N/A'}`,
        'END:VCARD'
    ].join('\n');

    try {
        const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Dr_${safeName.replace(/\s+/g, '_')}.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error generando vCard", e);
    }
};

const DigitalCard: React.FC = () => {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ patientsCount: 0, avgDuration: 0, loadingStats: true });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;
    const init = async () => {
        await loadData();
    };
    init();
    return () => { mounted = false; };
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(profileData || { full_name: 'Doctor', specialty: 'Medicina General' });

        let finalCount = 0;
        const { count: countDoc } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id);
        if (countDoc !== null) finalCount = countDoc;
        else {
            const { count: countUser } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
            if (countUser !== null) finalCount = countUser;
        }

        let calculatedAvg = 0;
        const { data: consults } = await supabase.from('consultations').select('summary').eq('doctor_id', user.id).limit(50);
        if (consults && consults.length > 0) {
            const total = consults.reduce((acc, curr) => acc + (15 + Math.round((curr.summary?.length || 0)/50)), 0);
            calculatedAvg = Math.round(total / consults.length);
        } else {
             const { data: appts } = await supabase.from('appointments').select('duration_minutes').eq('doctor_id', user.id);
             if (appts && appts.length > 0) {
                 const total = appts.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
                 calculatedAvg = Math.round(total / appts.length);
             }
        }
        
        setStats({ patientsCount: finalCount, avgDuration: calculatedAvg, loadingStats: false });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = ['full_name', 'specialty', 'phone', 'license_number', 'logo_url', 'website_url', 'address'];
    const filled = fields.filter(f => {
        const val = profile[f];
        return typeof val === 'string' && val.trim() !== '';
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if(!searchTerm.trim()) return;
      window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`, '_blank');
  };

  const getQRTarget = () => {
    if (profile?.website_url) return profile.website_url;
    if (profile?.phone) return `https://wa.me/${profile.phone.replace(/\D/g, '')}`;
    return window.location.href;
  };

  const handleShare = async () => {
    if (navigator.share) try { await navigator.share({ title: `Dr. ${profile?.full_name}`, url: getQRTarget() }); } catch (e) {}
    else alert("Enlace copiado manualmente.");
  };

  // --- RECURSOS OFICIALES (SEGURIDAD Y TRÁMITES) ---
  // CORRECCIÓN: Usamos enlaces a los Portales de Formatos, no a los PDFs directos que caducan.
  const OFFICIAL_RESOURCES = [
      { name: 'Portal Formatos GNP', url: 'https://www.gnp.com.mx/personas/seguros-medicos', color: 'blue' },
      { name: 'Portal Formatos AXA', url: 'https://axa.mx/personas/servicios/formatos', color: 'red' },
      { name: 'Portal Formatos MetLife', url: 'https://www.metlife.com.mx/servicio-y-apoyo/centro-de-formatos/', color: 'cyan' },
      { name: 'Alertas COFEPRIS', url: 'https://www.gob.mx/cofepris', color: 'amber' }
  ];

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400 gap-2"><Activity className="animate-spin"/> Cargando Hub...</div>;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/30">
      
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Hub Profesional <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wider">v2.1</span></h1>
            <p className="text-slate-500 text-sm">Panel de control estratégico y herramientas clínicas.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate('/consultation')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all"><Stethoscope size={16}/> Nueva Consulta</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (IDENTIDAD DIGITAL) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative group hover:shadow-2xl transition-all duration-300">
                <div className="h-28 bg-gradient-to-br from-slate-800 via-slate-900 to-black relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-4 right-4 text-white/20"><Briefcase size={24}/></div>
                </div>
                <div className="px-6 pb-6 text-center relative">
                    <div className="-mt-14 mb-4 inline-block p-1.5 bg-white rounded-2xl shadow-lg ring-4 ring-slate-50">
                        <div className="w-28 h-28 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                            {profile?.logo_url ? <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover"/> : <span className="text-4xl font-bold text-slate-300">{profile?.full_name?.charAt(0)}</span>}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{profile?.full_name}</h3>
                    <p className="text-teal-600 font-bold text-xs uppercase tracking-wide mt-1 mb-6">{profile?.specialty}</p>
                    
                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-200 inline-block mb-6 group-hover:border-teal-400 transition-colors">
                        <QRCode value={getQRTarget()} size={120} level="M" fgColor="#0f172a"/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
                            <Share2 size={16}/> Compartir
                        </button>
                        <button onClick={() => generateVCard(profile)} className="flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold hover:bg-teal-100 border border-teal-100 active:scale-95 transition-all">
                            <Download size={16}/> Guardar vCard
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Barra de Progreso */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-3 relative z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Perfil Profesional</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profileCompleteness === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{profileCompleteness}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
                    <div className={`h-full rounded-full transition-all duration-1000 ${profileCompleteness === 100 ? 'bg-green-500' : 'bg-amber-400'}`} style={{width: `${profileCompleteness}%`}}></div>
                </div>
                {profileCompleteness < 100 && (
                    <button onClick={() => navigate('/settings')} className="mt-4 w-full text-xs font-bold text-slate-600 hover:text-teal-600 flex items-center justify-center gap-1 transition-colors relative z-10">
                        Completar Información <ExternalLink size={10}/>
                    </button>
                )}
            </div>

            {/* --- INTEGRACIÓN BLOC DE NOTAS --- */}
            <QuickNotes />

        </div>

        {/* COLUMNA DERECHA (OPERACIONES) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* ZONA: Herramientas Clínicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InteractiveClinicalCase />
                <MedicalCalculators />
            </div>

            {/* KPIs & Accesos Rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between aspect-square md:aspect-auto md:h-28 group hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start"><div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Users size={20}/></div></div>
                    <div><span className="text-2xl font-bold text-slate-800">{stats.patientsCount}</span><p className="text-xs text-slate-500 font-medium">Pacientes</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between aspect-square md:aspect-auto md:h-28 group hover:border-purple-200 transition-colors">
                    <div className="flex justify-between items-start"><div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform"><Clock size={20}/></div></div>
                    <div><span className="text-2xl font-bold text-slate-800">{stats.avgDuration > 0 ? stats.avgDuration + 'm' : '--'}</span><p className="text-xs text-slate-500 font-medium">Promedio</p></div>
                </div>
                <button onClick={() => navigate('/agenda')} className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md flex flex-col justify-center items-center text-center aspect-square md:aspect-auto md:h-28 transition-all group">
                    <Calendar size={24} className="text-slate-400 group-hover:text-teal-600 mb-2 transition-colors"/>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Agenda</span>
                </button>
                <button onClick={() => navigate('/reports')} className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md flex flex-col justify-center items-center text-center aspect-square md:aspect-auto md:h-28 transition-all group">
                    <FileText size={24} className="text-slate-400 group-hover:text-teal-600 mb-2 transition-colors"/>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Reportes</span>
                </button>
            </div>

            {/* Buscador de Evidencia */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Search size={100}/></div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Globe size={18} className="text-teal-500"/> Investigación Clínica</h3>
                <form onSubmit={handleSearch} className="relative mb-6 z-10">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar artículos en PubMed, guías, dosis..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10 relative">
                    {[{name:'PLM / Vademécum', url:'https://www.medicamentosplm.com/', icon:BookOpen}, {name:'MDCalc', url:'https://www.mdcalc.com/', icon:Activity}, {name:'CIE-10 OMS', url:'https://icd.who.int/', icon:FileText}, {name:'CENETEC Guías', url:'https://cenetec-difusion.com/', icon:Globe}].map((t, i) => (
                        <a key={i} href={t.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-teal-50 hover:border-teal-100 transition-all group">
                            <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white group-hover:text-teal-600 transition-colors"><t.icon size={14} className="text-slate-500 group-hover:text-teal-600"/></div>
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800 leading-tight">{t.name}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* SECCIÓN NUEVA: CENTRAL DE TRÁMITES Y SEGURIDAD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 relative p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-indigo-600"/> 
                        Gestión Administrativa y Seguridad
                    </h3>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">Recursos Oficiales</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {OFFICIAL_RESOURCES.map((resource, idx) => (
                        <a 
                            key={idx} 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md group ${
                                resource.color === 'blue' ? 'border-blue-100 bg-blue-50/50 hover:border-blue-300' :
                                resource.color === 'red' ? 'border-red-100 bg-red-50/50 hover:border-red-300' :
                                resource.color === 'cyan' ? 'border-cyan-100 bg-cyan-50/50 hover:border-cyan-300' :
                                'border-amber-100 bg-amber-50/50 hover:border-amber-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                    resource.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                    resource.color === 'red' ? 'bg-red-100 text-red-600' :
                                    resource.color === 'cyan' ? 'bg-cyan-100 text-cyan-600' :
                                    'bg-amber-100 text-amber-600'
                                }`}>
                                    {resource.name.includes('Alertas') ? <AlertTriangle size={18} /> : <FileCheck size={18} />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{resource.name}</p>
                                    <p className="text-[10px] text-slate-500">Descarga directa oficial</p>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-slate-300 group-hover:text-slate-500"/>
                        </a>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default DigitalCard;