import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const masterTranscriptRef = useRef(''); 
  const isUserInitiatedStop = useRef(false);
  
  // NUEVO: Control de tiempo de reinicio para latencia cero
  const lastRestartRef = useRef(0);

  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false; // Mantenemos false para estabilidad en Android
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    
    // TRUCO: Aumentamos maxAlternatives para forzar al motor a procesar más contexto interno
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
        let currentFinal = '';
        let currentInterim = '';
  
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentFinal) {
            const spacer = masterTranscriptRef.current && !masterTranscriptRef.current.endsWith(' ') ? ' ' : '';
            masterTranscriptRef.current += spacer + currentFinal;
        }

        // UX: Mostramos interim solo si tiene contenido sustancial
        const displayInterim = currentInterim.trim() ? ' ' + currentInterim.trim() : '';
        setTranscript(masterTranscriptRef.current + displayInterim);
    };

    recognition.onerror = (event: any) => {
      // Ignoramos errores triviales para mantener el bucle vivo
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
    };

    recognition.onend = () => {
      if (!isUserInitiatedStop.current) {
         // ESTRATEGIA DE REINICIO ULTRARRÁPIDO
         const now = Date.now();
         const timeSinceLastStart = now - lastRestartRef.current;
         
         // Si el reinicio fue hace menos de 1 segundo, asumimos inestabilidad y damos un respiro.
         // Si fue hace más (dictado normal), reiniciamos INMEDIATAMENTE para sensación continua.
         const delay = timeSinceLastStart < 1000 ? 50 : 0; 

         setTimeout(() => {
             try {
               recognition.start();
               lastRestartRef.current = Date.now();
             } catch (e) {
               // Si falla el arranque inmediato, reintentamos con un poco mas de margen
               setTimeout(() => {
                   if (!isUserInitiatedStop.current) {
                       try { recognition.start(); } catch(e){}
                   }
               }, 150);
             }
         }, delay);
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    masterTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }

    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
            lastRestartRef.current = Date.now();
            setIsListening(true);
        } catch (e) {
            console.error(e);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }
    setTranscript(masterTranscriptRef.current); // Fijar texto final limpio
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    masterTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      masterTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  useEffect(() => {
      return () => {
          isUserInitiatedStop.current = true;
          if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e){}
          }
      };
  }, []);

  return { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript: setTranscriptManual };
};