import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useAppointmentAlarms = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSilent, setIsSilent] = useState(false);
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const savedPreference = localStorage.getItem('mediscribe_silent_mode');
    setIsSilent(savedPreference === 'true');

    audioRef.current = new Audio('/alarm.mp3'); 
    audioRef.current.volume = 0.6;
  }, []);

  const toggleSound = () => {
    const newState = !isSilent;
    setIsSilent(newState);
    localStorage.setItem('mediscribe_silent_mode', String(newState));
    
    toast(newState ? "🔕 Modo Silencio Activado" : "🔔 Sonido Activado", {
      duration: 2000,
    });
  };

  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const checkAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('date_time', todayStart)
        .lt('date_time', tomorrowStart);

      if (!appointments || appointments.length === 0) return;

      const currentTime = new Date().getTime();

      appointments.forEach((appt) => {
        const apptTime = new Date(appt.date_time).getTime();
        const diffMs = apptTime - currentTime;
        const diffInMinutes = Math.floor(diffMs / 60000);

        const alertKey30 = `${appt.id}-30`;
        const alertKey15 = `${appt.id}-15`;

        if (diffInMinutes === 30 && !alertedRef.current.has(alertKey30)) {
          triggerSmartAlarm(appt.patient_name, 30);
          alertedRef.current.add(alertKey30);
        }

        if (diffInMinutes === 15 && !alertedRef.current.has(alertKey15)) {
          triggerSmartAlarm(appt.patient_name, 15);
          alertedRef.current.add(alertKey15);
        }
      });
    };

    const intervalId = setInterval(checkAppointments, 60000);
    checkAppointments();

    return () => clearInterval(intervalId);
  }, [isSilent]);

  const triggerSmartAlarm = (patientName: string, minutes: number) => {
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500]);
    }

    if (!isSilent && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio autoplay bloqueado", e));
    }

    toast.custom((t) => (
      <div className="bg-white rounded-xl shadow-2xl border-l-4 border-indigo-500 p-4 w-full max-w-sm pointer-events-auto flex flex-col gap-3 animate-enter">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    ⏰ Cita en {minutes} min
                </h4>
                <p className="text-sm text-slate-600 mt-1">Paciente: <strong>{patientName}</strong></p>
            </div>
            {isSilent ? <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Silencio</span> : <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded">Sonando</span>}
        </div>
        
        <div className="flex gap-2 mt-1">
            <button 
                onClick={() => {
                    toast.dismiss(t);
                    if(audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    }
                }}
                className="flex-1 bg-indigo-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
                Entendido
            </button>
            <button 
                 onClick={() => {
                    toast.dismiss(t);
                     if(audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    }
                    window.location.href = '/appointments';
                 }}
                 className="px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200"
            >
                Ver Agenda
            </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });

    if (Notification.permission === "granted") {
      try {
        new Notification(`Cita en ${minutes} min: ${patientName}`, {
          body: isSilent ? "Alerta silenciosa" : "Toca para abrir",
          icon: '/pwa-192x192.png',
          silent: isSilent
        });
      } catch (e) {
        console.log("Error notificación nativa", e);
      }
    }
  };

  return { isSilent, toggleSound };
};