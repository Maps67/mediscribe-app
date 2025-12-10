import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para extender Window y evitar errores de TS
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- ALGORITMO ANTI-ECO OPTIMIZADO ---
// Compara el final del texto A con el inicio del texto B para eliminar solapamientos
function getOverlapLength(a: string, b: string) {
  if (b.length === 0 || a.length === 0) return 0;
  // Optimización: Solo mirar los últimos 50 caracteres para rendimiento
  const maxCheck = Math.min(a.length, b.length, 50); 
  for (let len = maxCheck; len > 0; len--) {
    if (a.slice(-len) === b.slice(0, len)) return len;
  }
  return 0;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Detección de Móvil Robusta (Android/iOS)
  const isMobile = useRef(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  // Detección de Soporte API
  const [isAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  const wakeLockRef = useRef<any>(null);
  
  // Refs para mantener el estado del texto sin depender del ciclo de render de React
  const finalTranscriptRef = useRef('');

  // --- GESTIÓN DE ENERGÍA (WAKE LOCK) ---
  // Evita que la pantalla se apague mientras el médico dicta (Crítico en Móvil)
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try { 
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); 
      } catch (err) {
          console.warn('Wake Lock error:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { 
          await wakeLockRef.current.release(); 
          wakeLockRef.current = null; 
      } catch (err) {
          console.warn('Wake Lock release error:', err);
      }
    }
  }, []);

  // Re-aplicar Wake Lock si la app vuelve a primer plano (tab switch)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  // --- LÓGICA DE RECONOCIMIENTO OPTIMIZADA ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    // Limpieza de instancia previa si existe
    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    // CONFIGURACIÓN HÍBRIDA (LA CLAVE DEL FIX)
    // Desktop: continuous = true (Mejor experiencia, fluido)
    // Móvil: continuous = false (Evita el bug de duplicación de Android) + Reinicio Manual
    recognition.continuous = !isMobile.current; 
    
    recognition.interimResults = true;          // Ver texto en tiempo real
    recognition.lang = 'es-MX';                 // Forzar español latino
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
      requestWakeLock();
      
      // Feedback Háptico (Vibración) solo en móviles
      if (isMobile.current && navigator.vibrate) {
          navigator.vibrate(50);
      }
    };

    recognition.onresult = (event: any) => {
      let interimChunk = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        
        // HACK DE ANDROID: A veces envía confianza 0 en duplicados fantasmas
        if (isMobile.current && res[0].confidence === 0) continue;

        if (res.isFinal) {
          finalChunk += res[0].transcript;
        } else {
          interimChunk += res[0].transcript;
        }
      }

      // Procesamiento de Texto Final
      if (finalChunk) {
        const cleanFinal = finalChunk.trim();
        const currentFinal = finalTranscriptRef.current.trim();
        
        // Algoritmo Anti-Eco: Verifica si lo nuevo ya está al final de lo viejo
        const overlap = getOverlapLength(currentFinal, cleanFinal);
        const newPart = cleanFinal.slice(overlap).trim();
        
        if (newPart) {
            // Capitalización inteligente (si no es continuación de palabra)
            const prefix = (currentFinal && !currentFinal.endsWith(' ')) ? ' ' : '';
            const formatted = newPart.charAt(0).toUpperCase() + newPart.slice(1);
            finalTranscriptRef.current = currentFinal + prefix + formatted;
        }
      }

      // Actualización visual inmediata
      const displayText = (finalTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
      setTranscript(displayText);
    };

    recognition.onerror = (event: any) => {
      // Ignoramos 'no-speech' para evitar parpadeos visuales
      if (event.error === 'no-speech') return; 
      
      console.warn('Speech Error:', event.error);

      // Si el error es de permisos o bloqueo, paramos todo
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // LÓGICA "STICKY RESTART" (CRÍTICA PARA MÓVIL)
      // Si el usuario NO le dio a stop, significa que el navegador cortó (por silencio o bug).
      // Lo reiniciamos inmediatamente para simular continuidad infinita.
      if (!isUserInitiatedStop.current) {
          // Pequeño delay para no saturar la pila de llamadas del navegador
          setTimeout(() => {
              if (!isUserInitiatedStop.current) {
                  try { 
                      recognition.start(); 
                  } catch(e) {
                      console.log('Reinicio rápido falló, reintentando...', e);
                  }
              }
          }, 50); // 50ms es imperceptible para el humano
      } else {
        // Apagado real y voluntario
        setIsListening(false);
        releaseWakeLock();
        if (isMobile.current && navigator.vibrate) {
            navigator.vibrate([50, 50, 50]); // Doble vibración al apagar
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setIsListening(false); }
  }, [isAPISupported, requestWakeLock, releaseWakeLock]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; // Bandera: "Yo quise pararlo"
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    
    // Al detener, aseguramos que el texto final quede guardado
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  // Permite editar el texto manualmente desde el textarea y que la IA siga desde ahí
  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Limpieza de recursos al desmontar el componente
  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
        releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    setTranscript: setTranscriptManual, 
    isAPISupported 
  };
};