import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para soportar navegadores modernos y legacy (Chrome/Edge/Safari)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAPISupported, setIsAPISupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef(''); // Memoria a largo plazo
  const isUserInitiatedStop = useRef(false); // Flag para evitar auto-restart si el usuario paró

  // Función constructora del reconocedor
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsAPISupported(false);
      return null;
    }

    setIsAPISupported(true);
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX'; // Español México
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
    };

    /**
     * LÓGICA CORE CORREGIDA (FIX BUCLE INFINITO)
     * En lugar de comparar longitudes de string, iteramos desde el 'resultIndex'.
     * Esto garantiza que solo procesamos los NUEVOS fragmentos que llegan.
     */
    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      // Iteramos solo sobre los resultados nuevos proporcionados en este evento
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // Si es final, lo guardamos en la memoria permanente
          // Agregamos un espacio natural si no lo tiene
          const prev = finalTranscriptRef.current;
          const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
          finalTranscriptRef.current += spacer + transcriptSegment;
        } else {
          // Si es interino (estás hablando), lo guardamos temporalmente
          interimTranscript += transcriptSegment;
        }
      }

      // Actualizamos el estado UI: Lo permanente + Lo que estás diciendo ahora mismo
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech API Error:", event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
    };

    /**
     * AUTO-RESTART ROBUSTO
     * Si la API se corta sola (por silencio), la reiniciamos automáticamente
     * A MENOS QUE el usuario haya pulsado "Detener".
     */
    recognition.onend = () => {
      if (!isUserInitiatedStop.current) {
          try {
            console.log("Reiniciando escucha por silencio...");
            recognition.start();
          } catch (e) {
            // Si falla el reinicio inmediato, esperamos un poco
            setTimeout(() => {
              if (!isUserInitiatedStop.current && recognitionRef.current) {
                  try { recognition.start(); } catch(err) { console.error("Fallo reintento", err); }
              }
            }, 300);
          }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  // --- CONTROLES PÚBLICOS ---

  const startListening = useCallback(() => {
    // 1. Limpieza de estado previo
    finalTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    // 2. Detener instancia anterior si existe (zombie prevention)
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    // 3. Crear nueva instancia limpia
    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Error al iniciar reconocimiento:", e);
            setIsListening(false);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; // Marcar parada manual
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    // Al parar, aseguramos que el transcript final sea lo único que queda
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  // Permite editar el texto manualmente desde el textarea sin romper la memoria de la IA
  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Limpieza al desmontar componente
  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) {
             try { recognitionRef.current.stop(); } catch(e) {}
        }
    };
  }, []);

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