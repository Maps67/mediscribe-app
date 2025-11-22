import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useAppointmentAlarms = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Usamos un Ref para rastrear qué alertas ya sonaron y evitar duplicados en el mismo minuto
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. Configurar Audio (Sonido de campana sutil)
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.6;

    // 2. Solicitar permiso para notificaciones nativas del sistema (Android/Windows/Mac)
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const checkAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener rango del día actual
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Consultar citas pendientes de hoy
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

        // Clave única para identificar esta alerta específica (ID cita + minutos)
        const alertKey30 = `${appt.id}-30`;
        const alertKey15 = `${appt.id}-15`;

        // --- ALERTA 30 MINUTOS ---
        if (diffInMinutes === 30 && !alertedRef.current.has(alertKey30)) {
          triggerAlarm(appt.patient_name, 30);
          alertedRef.current.add(alertKey30);
        }

        // --- ALERTA 15 MINUTOS ---
        if (diffInMinutes === 15 && !alertedRef.current.has(alertKey15)) {
          triggerAlarm(appt.patient_name, 15);
          alertedRef.current.add(alertKey15);
        }
      });
    };

    // Verificar cada 60 segundos
    const intervalId = setInterval(checkAppointments, 60000);
    
    // Verificar inmediatamente al montar
    checkAppointments();

    return () => clearInterval(intervalId);
  }, []);

  const triggerAlarm = (patientName: string, minutes: number) => {
    // A. Reproducir sonido
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("El navegador bloqueó el autplay de audio (interacción requerida)."));
    }

    // B. Notificación en la App (Toast visual)
    toast.info(`⏰ Cita en ${minutes} min`, {
      description: `Paciente: ${patientName}. Prepárate para la consulta.`,
      duration: 8000, // 8 segundos visible
      action: {
        label: 'Ver Agenda',
        onClick: () => window.location.href = '/appointments'
      },
    });

    // C. Notificación del Sistema Operativo (Funciona minimizado)
    if (Notification.permission === "granted") {
      try {
        new Notification("MediScribe AI: Recordatorio", {
          body: `Tu consulta con ${patientName} comienza en ${minutes} minutos.`,
          icon: '/pwa-192x192.png', // Icono de la app
          vibrate: [200, 100, 200] // Vibración en Android
        });
      } catch (e) {
        console.log("Error en notificación nativa", e);
      }
    }
  };
};