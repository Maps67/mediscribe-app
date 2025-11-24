import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // REFERENCIAS (Memoria que no provoca re-renderizados)
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // Control maestro de estado
  const accumulatedTextRef = useRef(''); // Aquí guardamos el texto confirmado para que no se pierda al reiniciar

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // --- CONFIGURACIÓN ANTI-BUCLE ---
      recognition.continuous = false; // CLAVE: Esto evita que el celular repita texto infinito
      recognition.interimResults = true; // Mantiene la escritura en tiempo real
      recognition.lang = 'es-MX';

      // --- PROCESAMIENTO DE AUDIO ---
      recognition.onresult = (event: any) => {
        if (!isListeningRef.current) return;

        let interimTranscript = '';
        let finalTranscriptChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            // Si la frase terminó, la guardamos en el chunk final
            finalTranscriptChunk += event.results[i][0].transcript + ' ';
          } else {
            // Si está escribiendo, es temporal
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Si hubo texto final, lo sumamos a la memoria maestra
        if (finalTranscriptChunk) {
            accumulatedTextRef.current += finalTranscriptChunk;
        }

        // Renderizamos: Lo que ya teníamos guardado + Lo que se está diciendo ahorita
        setTranscript(accumulatedTextRef.current + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        // Ignoramos 'no-speech' porque es normal en pausas
        if (event.error !== 'no-speech') {
            console.warn("Speech API Error:", event.error);
            // Si es error grave de permisos, matamos todo
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                stopListening();
            }
        }
      };

      // --- EL BUCLE DE REINICIO (Walkie-Talkie Automático) ---
      recognition.onend = () => {
        // Si el usuario NO ha dado la orden de parar, reiniciamos inmediatamente.
        // Esto simula "escucha continua" pero limpiando el buffer de memoria cada vez.
        if (isListeningRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // Si falla el reinicio rápido, reintentamos en 100ms (protección contra crashes)
                setTimeout(() => {
                    if (isListeningRef.current) {
                        try { recognition.start(); } catch(err) { stopListening(); }
                    }
                }, 100);
            }
        } else {
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    // LIMPIEZA NUCLEAR (Al salir de la pantalla)
    return () => {
        if (recognitionRef.current) {
            isListeningRef.current = false;
            recognitionRef.current.abort(); 
        }
    };
  }, []);

  // --- CONTROLES ---

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        accumulatedTextRef.current = ''; // Limpiamos memoria vieja
        setTranscript('');
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error al iniciar:", error);
        setIsListening(false);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false; // Bajamos la bandera maestra
    setIsListening(false);
    
    if (recognitionRef.current) {
      // .abort() corta el micrófono al instante
      recognitionRef.current.abort(); 
    }
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedTextRef.current = '';
    setTranscript('');
  }, []);

  return { isListening, transcript, startListening, stopListening, resetTranscript };
};