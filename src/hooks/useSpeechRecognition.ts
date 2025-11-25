import { useState, useEffect, useRef, useCallback } from 'react';

// --- TIPADO ESTRICTO PARA WEB SPEECH API ---
interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs para mantener estado síncrono dentro de los listeners
  const recognitionRef = useRef<any>(null);
  const userStoppedRef = useRef(false); // Flag crítico: ¿Fue el usuario o el navegador?

  useEffect(() => {
    // 1. Detección de API (Soporte Cruzado)
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition API no soportada en este navegador.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;      // Escucha continua
    recognition.interimResults = true;  // Resultados parciales (mientras habla)
    recognition.lang = 'es-MX';         // Configuración regional
    recognition.maxAlternatives = 1;

    // --- EVENT LISTENERS ---

    recognition.onstart = () => {
      setIsListening(true);
      userStoppedRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reconstrucción inteligente del transcript
      // Evita duplicados reconstruyendo desde el índice 0 del buffer actual
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      // Combinamos lo que ya teníamos confirmado + lo nuevo
      // NOTA: Para este caso de uso simple, reemplazamos todo para mantener sincronía
      // Si la app crece, deberíamos usar un acumulador fuera del evento.
      let currentBuffer = '';
      for (let i = 0; i < event.results.length; i++) {
          currentBuffer += event.results[i][0].transcript;
      }
      setTranscript(currentBuffer);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Speech Recognition Error:", event.error);
      
      if (event.error === 'not-allowed') {
        setIsListening(false);
        userStoppedRef.current = true; // Bloqueo permanente si no hay permiso
      }
      // 'no-speech' es común si hay silencio. Lo ignoramos para que el onend reinicie.
    };

    recognition.onend = () => {
      // LÓGICA CRÍTICA DE RECONEXIÓN
      if (!userStoppedRef.current) {
        // Si el usuario NO paró, intentamos reiniciar (Keep-Alive)
        console.log("Reinicio automático del micrófono...");
        try {
            recognition.start();
        } catch (e) {
            // Si falla el reinicio inmediato, esperamos un poco
            setTimeout(() => {
                if(!userStoppedRef.current) recognition.start();
            }, 300);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      // Cleanup al desmontar componente
      userStoppedRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // --- MÉTODOS PÚBLICOS ---

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      userStoppedRef.current = false; // Reset flag
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Intento de doble inicio ignorado:", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      userStoppedRef.current = true; // Señalizamos parada intencional
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript // Necesario para recuperar borradores
  };
};