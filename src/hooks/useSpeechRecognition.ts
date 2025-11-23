import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Verificación de compatibilidad del navegador
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Seguir escuchando aunque haya pausas
      recognitionRef.current.interimResults = true; // CLAVE: Mostrar resultados mientras se habla
      recognitionRef.current.lang = 'es-MX'; // Español México

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Actualizamos el estado combinando lo guardado previamente + lo nuevo final + lo temporal
        // Nota: En modo 'continuous', a veces es mejor acumular en el estado
        setTranscript((prev) => {
            // Si es un resultado nuevo (index 0), limpiamos o mantenemos lógica.
            // Para simplificar visualmente, reconstruimos basado en el evento actual si es continuo,
            // o simplemente mostramos lo que el navegador nos da.
            
            // Estrategia simple y robusta:
            // El API a veces devuelve todo el buffer, a veces solo lo nuevo.
            // Vamos a usar una estrategia visual directa:
            const currentText = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');
            return currentText;
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Error de reconocimiento de voz:", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        // Si se detiene solo pero el estado dice que seguimos escuchando, lo reiniciamos
        // Esto evita cortes inesperados en Android
        if (isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                setIsListening(false);
            }
        }
      };
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        setTranscript(''); // Limpiar anterior al iniciar nuevo
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error al iniciar:", error);
      }
    } else {
        alert("Tu navegador no soporta reconocimiento de voz. Intenta con Chrome.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return { isListening, transcript, startListening, stopListening, resetTranscript };
};