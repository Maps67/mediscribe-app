import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  // Estado UI
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  
  // Almacén de texto confirmado (Buffer Maestro)
  const finalTranscriptRef = useRef('');

  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    
    // VOLVEMOS A TRUE: Confiamos en el filtrado por índice en lugar del reinicio forzado
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';

    recognition.onstart = () => {
      setIsListening(true);
    };

    // LÓGICA DE FILTRADO MATEMÁTICO (El corazón del fix)
    recognition.onresult = (event: any) => {
        let interimContent = '';

        // TRUCO CLAVE: Usamos 'event.resultIndex'
        // Esto le dice al bucle: "No leas todo desde el principio, lee solo lo nuevo".
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          
          if (result.isFinal) {
            // Solo si Android confirma que la frase terminó, la guardamos
            const prev = finalTranscriptRef.current;
            const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
            finalTranscriptRef.current += spacer + result[0].transcript;
          } else {
            // Si es provisional, lo guardamos temporalmente para mostrarlo
            interimContent += result[0].transcript;
          }
        }

        // Renderizamos: Lo Final (Seguro) + Lo Interino (Borrador)
        setTranscript(finalTranscriptRef.current + (interimContent ? ' ' + interimContent : ''));
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Error:", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
      // Ignoramos 'no-speech' para que el onend reinicie el servicio automáticamente
    };

    recognition.onend = () => {
      // Si el navegador corta por silencio natural (después de mucho tiempo)
      // y el usuario NO pidió parar, reiniciamos suavemente.
      if (!isUserInitiatedStop.current) {
          console.log("Reinicio automático por timeout del navegador...");
          try {
            recognition.start();
          } catch (e) {
            // Si falla, esperamos un poco antes de reintentar
            setTimeout(() => {
              if (!isUserInitiatedStop.current) {
                  try { recognition.start(); } catch(e){}
              }
            }, 500);
          }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  // --- CONTROLES ---

  const startListening = useCallback(() => {
    finalTranscriptRef.current = ''; // Limpiar buffer al iniciar nueva sesión
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
        } catch (e) {
            console.error("Error start:", e);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; // Bandera manual
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }
    // Al parar, aseguramos que se muestre lo último confirmado
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

  // Cleanup
  useEffect(() => {
      return () => {
          isUserInitiatedStop.current = true;
          if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e){}
          }
      };
  }, []);

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    setTranscript: setTranscriptManual 
  };
};