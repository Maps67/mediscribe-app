import { useState, useEffect, useRef, useCallback } from 'react';

// Tipado para soportar navegadores (Chrome/Safari/Edge)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Inicialización segura del API de voz del navegador
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX'; // Ajustado a español latino

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        // Concatenamos o reemplazamos según la lógica deseada. 
        // Aquí reemplazamos para mantener la sincronía exacta con el buffer de audio.
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Error Speech Recognition:", event.error);
        if (event.error === 'not-allowed') {
            setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Este navegador no soporta Speech Recognition API");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error al iniciar grabación:", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // --- EL FIX ESTÁ AQUÍ ---
  // Retornamos 'setTranscript' para que ConsultationView pueda inyectar
  // el texto recuperado del SessionStorage.
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript 
  };
};