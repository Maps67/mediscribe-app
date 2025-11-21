import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { Share2, Copy, Phone, Globe, MapPin, Check } from 'lucide-react';

const DigitalCard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      // Usamos datos del perfil o fallbacks elegantes si están vacíos
      setProfile(data || { full_name: 'Doctor', specialty: 'Medicina General', phone: '' });
    }
    setLoading(false);
  };

  // Generar formato vCard para guardar contacto al escanear
  const generateVCard = () => {
    if (!profile) return '';
    return `BEGIN:VCARD
VERSION:3.0
FN:Dr. ${profile.full_name}
ORG:MediScribe Specialist
TEL:${profile.phone || ''}
TITLE:${profile.specialty}
NOTE:Generado con MediScribe AI
END:VCARD`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tarjeta Digital - Dr. ${profile?.full_name}`,
          text: `Agenda una cita con el Dr. ${profile?.full_name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error compartiendo', error);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400">Cargando perfil...</div>;

  return (
    <div className="p-4 max-w-md mx-auto min-h-[calc(100vh-4rem)] flex flex-col justify-center bg-slate-50">
      
      {/* Título Superior */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Tu Tarjeta Digital</h2>
        <p className="text-slate-500 text-xs">Comparte tu perfil profesional</p>
      </div>

      {/* TARJETA PRINCIPAL (Estilo Reference) */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full relative">
        
        {/* 1. Encabezado Degradado (Azul a Verde Clínico) */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-teal-400 w-full"></div>

        {/* 2. Contenido de la Tarjeta */}
        <div className="px-6 pb-8 relative">
          
          {/* Foto de Perfil (Superpuesta) */}
          <div className="flex justify-center -mt-16 mb-4">
            <div className="w-28 h-28 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-100">
                    {/* Aquí iría una etiqueta <img /> si tuvieran foto, por ahora usamos inicial */}
                    <span className="text-4xl font-bold text-slate-400">
                        {profile?.full_name?.charAt(0) || 'D'}
                    </span>
                </div>
            </div>
          </div>

          {/* Nombre y Especialidad */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800">Dr. {profile?.full_name}</h3>
            <p className="text-teal-600 font-medium text-sm mt-1">{profile?.specialty || "Especialidad Médica"}</p>
            <p className="text-slate-400 text-xs mt-1">Ced. Prof. {profile?.license_number || "En trámite"}</p>
          </div>

          {/* Lista de Contacto (Estilo Reference) */}
          <div className="space-y-4 mb-8 px-2">
            <div className="flex items-center gap-4 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    <Phone size={16} />
                </div>
                <span className="text-sm font-medium">{profile?.phone || "+52 (55) 0000 0000"}</span>
            </div>
            
            <div className="flex items-center gap-4 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Globe size={16} />
                </div>
                <span className="text-sm font-medium">www.mediscribe-demo.com</span>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <MapPin size={16} />
                </div>
                <span className="text-sm font-medium">Hospital Ángeles, Consultorio 404</span>
            </div>
          </div>

          {/* Código QR */}
          <div className="flex flex-col items-center justify-center">
             <QRCode 
              value={generateVCard()} 
              size={140} 
              level="M" 
              fgColor="#1e293b"
            />
            <p className="text-xs text-slate-400 mt-2">Escanea para guardar o ver perfil</p>
          </div>

        </div>
      </div>

      {/* SECCIÓN COMPARTIR (Botones Externos como la referencia) */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button 
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-xl shadow-sm font-semibold text-sm active:bg-slate-50 transition-colors"
        >
          <Share2 size={18} className="text-teal-600"/>
          Compartir Link
        </button>

        <button 
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-xl shadow-sm font-semibold text-sm active:bg-slate-50 transition-colors"
        >
          {copied ? <Check size={18} className="text-green-600"/> : <Copy size={18} className="text-blue-600"/>}
          {copied ? "¡Copiado!" : "Copiar URL"}
        </button>
      </div>

    </div>
  );
};

export default DigitalCard;