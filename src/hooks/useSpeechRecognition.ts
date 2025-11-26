import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para soportar navegadores modernos y legacy (Chrome/Edge/Safari)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // OPTIMIZACIÓN: Detección síncrona inicial para evitar parpadeos del mensaje de error
  const [isAPISupported, setIsAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef(''); // Memoria a largo plazo
  const isUserInitiatedStop = useRef(false); // Flag para evitar auto-restart si el usuario paró

  // Función constructora del reconocedor
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    // Doble verificación de seguridad
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
     * LÓGICA CORE (FIX BUCLE INFINITO)
     * Iteramos desde resultIndex para procesar solo nuevos fragmentos.
     */
    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      // Iteramos solo sobre los resultados nuevos proporcionados en este evento
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // Si es final, lo guardamos en la memoria permanente
          const prev = finalTranscriptRef.current;
          const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
          finalTranscriptRef.current += spacer + transcriptSegment;
        } else {
          // Si es interino (estás hablando), lo guardamos temporalmente
          interimTranscript += transcriptSegment;
        }
      }

      // Actualizamos el estado UI
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech API Error:", event.error);
      // 'not-allowed' = Permiso denegado. 'service-not-allowed' = Sin internet o sin soporte.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
    };

    /**
     * AUTO-RESTART ROBUSTO
     */
    recognition.onend = () => {
      if (!isUserInitiatedStop.current) {
          try {
            console.log("Reiniciando escucha por silencio...");
            recognition.start();
          } catch (e) {
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
    finalTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

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
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

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