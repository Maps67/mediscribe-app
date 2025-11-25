import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAPISupported, setIsAPISupported] = useState(false); 
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef(''); 
  const isUserInitiatedStop = useRef(false);

  // Funciones auxiliares para Wake Lock... (omitidas por brevedad, pero mantenidas en tu archivo)

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
    recognition.lang = 'es-MX';

    recognition.onstart = () => {
      setIsListening(true);
      // requestWakeLock(); // Si tienes el Wake Lock implementado, actívalo aquí
    };

    // LÓGICA V6: Lectura directa del texto (Simplificación extrema)
    recognition.onresult = (event: any) => {
        let currentTranscript = '';
        
        // Simplemente leemos todo el buffer y dejamos que el DOM lo reemplace.
        for (let i = 0; i < event.results.length; ++i) {
             currentTranscript += event.results[i][0].transcript;
        }

        // El texto final se actualiza directamente con lo que el motor piensa
        setTranscript(currentTranscript); 
        // No intentamos deducir por longitud, sino que confiamos en el buffer actual.
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        isUserInitiatedStop.current = true;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Bucle suave de reinicio
      if (!isUserInitiatedStop.current) {
         setTimeout(() => {
           try {
             recognition.start();
           } catch (e) {
             console.warn("Fallo reinicio V6:", e);
           }
         }, 500); // 500ms de delay para evitar el bloqueo del navegador
      } else {
        setIsListening(false);
        // releaseWakeLock(); // Si tienes el Wake Lock implementado, libéralo aquí
      }
    };
    
    recognitionRef.current = recognition;
    return recognition;
  }, []);

  // ... (MÉTODOS start, stop, reset, etc. deben ser mantenidos igual que la versión anterior,
  // pero el useEffect de inicialización debe llamar a setupRecognition())

  // Mantenemos la estructura de retorno
  const startListening = useCallback(() => { /* ... */ }, [/* ... */]);
  const stopListening = useCallback(() => { /* ... */ }, []);
  const resetTranscript = useCallback(() => { /* ... */ }, []);
  const setTranscriptManual = useCallback((text: string) => { /* ... */ }, []);
  
  useEffect(() => {
    // Esto se mantiene para asegurar la correcta inicialización y cleanup
    const recognitionInstance = setupRecognition();
    if (recognitionInstance) recognitionRef.current = recognitionInstance;
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [setupRecognition]);
  
  return { 
    isListening, transcript, startListening, stopListening, resetTranscript, 
    setTranscript: setTranscriptManual, isAPISupported 
  };
};