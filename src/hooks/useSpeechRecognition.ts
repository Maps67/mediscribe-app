import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // USAMOS REFS PARA PERSISTENCIA "A PRUEBA DE BALAS"
  // Esto evita que el texto se borre si el componente se re-renderiza o el mic se reinicia
  const recognitionRef = useRef<any>(null);
  const committedTextRef = useRef(''); // Texto confirmado (Final)
  const userStoppedRef = useRef(false); // ¿El usuario pidió parar?

  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("Speech API no soportada.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-MX';

    // --- MANEJO DE RESULTADOS (LÓGICA ANDROID) ---
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newFinalTranscript = '';

      // Iteramos SOLO sobre los nuevos resultados devueltos por la API
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        
        // Si el resultado es FINAL (Android confirmó la frase)
        if (result.isFinal) {
          newFinalTranscript += result[0].transcript;
        } else {
          // Si es INTERINO (Android está adivinando todavía)
          interimTranscript += result[0].transcript;
        }
      }

      // 1. Agregamos lo final al "Disco Duro" (Ref)
      if (newFinalTranscript) {
        // Añadimos un espacio para que no se pegue con lo anterior
        const prev = committedTextRef.current;
        // Lógica para evitar espacios dobles
        const spacer = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
        committedTextRef.current += spacer + newFinalTranscript;
      }

      // 2. Actualizamos la UI: Lo confirmado + Lo que se está hablando ahora
      // Esto elimina el parpadeo y la duplicación
      setTranscript(committedTextRef.current + (interimTranscript ? ' ' + interimTranscript : ''));
    };

    recognition.onerror = (event: any) => {
      // Ignoramos 'no-speech' porque usaremos reinicio automático
      if (event.error !== 'no-speech') {
          console.warn("Error de voz:", event.error);
      }
      if (event.error === 'not-allowed') {
        setIsListening(false);
        userStoppedRef.current = true;
      }
    };

    recognition.onend = () => {
      // LÓGICA DE "INMORTALIDAD"
      // Si el usuario NO pulsó "Detener", reiniciamos inmediatamente.
      // Android suele cortar el mic cada 10-15 segundos para ahorrar batería.
      if (!userStoppedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Si falla el reinicio inmediato, esperamos 200ms
          setTimeout(() => {
             if (!userStoppedRef.current) recognition.start();
          }, 200);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      userStoppedRef.current = true;
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // --- CONTROLES ---

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      userStoppedRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error al iniciar:", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      userStoppedRef.current = true; // BANDERA CRÍTICA
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    committedTextRef.current = ''; // Limpiamos también el buffer interno
  }, []);

  // Permite inyectar texto manualmente (para recuperar borradores)
  const setTranscriptManual = useCallback((text: string) => {
      setTranscript(text);
      committedTextRef.current = text;
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