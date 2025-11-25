import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  // --- ESTADOS ---
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAPISupported, setIsAPISupported] = useState(false); // Bandera para el botón
  
  // --- REFS (Buffer Persistente) ---
  const recognitionRef = useRef<any>(null);
  // finalTranscriptRef guarda todo el texto que la IA ya ha confirmado como final.
  const finalTranscriptRef = useRef(''); 
  const isUserInitiatedStop = useRef(false);

  // --- FUNCIÓN: INICIALIZACIÓN Y EVENTOS ---
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsAPISupported(false);
      return null;
    }

    setIsAPISupported(true); // API detectada y soportada
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // MANTENEMOS TRUE: Para estabilidad y evitar cortes abruptos
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    // --- LÓGICA DE DEDUPLICACIÓN POR LONGITUD (FIX CRÍTICO) ---
    recognition.onresult = (event: any) => {
        let currentInterim = '';
        let fullFinalTextFromEvent = '';
        
        // 1. Recorrer todos los resultados que el navegador envía (desde 0)
        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          
          if (result.isFinal) {
            fullFinalTextFromEvent += result[0].transcript;
          } else {
            // Nota: Aquí se asume que solo hay un resultado interino
            currentInterim = result[0].transcript;
          }
        }
        
        // 2. DEDUPLICACIÓN: Comparamos longitudes
        const currentConfirmedLength = finalTranscriptRef.current.length;
        
        if (fullFinalTextFromEvent.length > currentConfirmedLength) {
            // Extraer solo la parte nueva que ha confirmado la API
            const newlyConfirmedText = fullFinalTextFromEvent.substring(currentConfirmedLength);
            
            // Añadir el nuevo texto final. Aplicamos lógica de espaciado.
            const prev = finalTranscriptRef.current;
            const spacer = (prev && !prev.endsWith(' ') && newlyConfirmedText.length > 0) ? ' ' : '';
            finalTranscriptRef.current += spacer + newlyConfirmedText;
        }

        // 3. Renderizar: Lo Final (Seguro) + Lo Interino (Borrador)
        const displayInterim = currentInterim.trim() ? ' ' + currentInterim.trim() : '';
        setTranscript(finalTranscriptRef.current + displayInterim);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Error:", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
    };

    recognition.onend = () => {
      // BUCLE SUAVE DE REINICIO
      if (!isUserInitiatedStop.current) {
          console.log("Reinicio automático por timeout del navegador...");
          try {
            recognition.start();
          } catch (e) {
            setTimeout(() => {
              if (!isUserInitiatedStop.current) recognition.start();
            }, 500);
          }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  // --- MÉTODOS PÚBLICOS ---

  const startListening = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Error start:", e);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
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

  // Inicialización del hook al montar
  useEffect(() => {
    setupRecognition();
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [setupRecognition]);

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