import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState(''); // Texto en gris (lo que estás diciendo)
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const { webkitSpeechRecognition } = window as unknown as IWindow;
    
    if (!webkitSpeechRecognition) {
      console.error("Web Speech API no soportada en este navegador.");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;      // No detenerse al hacer pausas
    recognition.interimResults = true;  // Mostrar resultados mientras hablas
    recognition.lang = 'es-MX';         // Español México (mejor acento)

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interimChunk += result[0].transcript;
        }
      }

      if (finalChunk) {
        setTranscript((prev) => prev + ' ' + finalChunk);
        setInterimTranscript(''); // Limpiamos el interim al confirmar
      } else {
        setInterimTranscript(interimChunk);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Error de reconocimiento de voz:", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        alert("Permiso de micrófono denegado.");
      }
    };

    recognition.onend = () => {
      // Si el estado dice que debemos seguir escuchando, reiniciamos
      // (Esto evita que Chrome se apague solo a los 10 segundos de silencio)
      if (isListening) {
        try {
          recognition.start();
        } catch (error) {
          // Ignorar error si ya estaba iniciado
        }
      }
    };

    recognitionRef.current = recognition;
  }, [isListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript(''); // Limpiar anterior
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error al iniciar:", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript
  };
};