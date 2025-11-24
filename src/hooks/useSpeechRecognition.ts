import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Usamos refs para mantener el control total sin depender de re-renderizados
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // Referencia "verdadera" del estado

  useEffect(() => {
    // 1. Configuración Inicial
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Escucha continua
      recognition.interimResults = true; // Resultados en tiempo real
      recognition.lang = 'es-MX';

      // --- EVENTOS ---

      recognition.onresult = (event: any) => {
        // Si por alguna razón llega audio pero el sistema cree que está apagado, abortar.
        if (!isListeningRef.current) {
            recognition.abort();
            return;
        }

        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech API Error:", event.error);
        // Si hay error de permisos o red, matar proceso
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setIsListening(false);
            isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        // Lógica Anti-Zombie:
        // Solo reiniciamos si el usuario NO ha dado orden de parar.
        if (isListeningRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // Si falla el reinicio, apagamos todo
                setIsListening(false);
                isListeningRef.current = false;
            }
        } else {
            // Asegurar que el estado visual esté apagado
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    // 2. LIMPIEZA NUCLEAR AL SALIR (Desmontar componente)
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort(); // Corta el micrófono inmediatamente
            recognitionRef.current = null;
        }
        isListeningRef.current = false;
    };
  }, []);

  // --- FUNCIONES DE CONTROL ---

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        setTranscript(''); // Limpiar texto anterior
        recognitionRef.current.start();
        isListeningRef.current = true;
        setIsListening(true);
      } catch (error) {
        console.error("Error al iniciar:", error);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      // .abort() es clave: Mata la conexión con el hardware inmediatamente
      // a diferencia de .stop() que espera a que dejes de hablar.
      recognitionRef.current.abort(); 
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return { isListening, transcript, startListening, stopListening, resetTranscript };
};