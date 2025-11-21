import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState(''); // Texto en gris (procesando)
  
  const recognitionRef = useRef<any>(null);
  const isManuallyStopped = useRef(false); // Para saber si el usuario dio click a PARAR

  useEffect(() => {
    // Verificar soporte del navegador
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // CLAVE: No detenerse al hacer pausas
      recognition.interimResults = true; // Ver texto mientras hablas
      recognition.lang = 'es-MX'; // Español México

      recognition.onstart = () => {
        setIsListening(true);
        isManuallyStopped.current = false;
      };

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) setTranscript((prev) => prev + final);
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.error("Error voz:", event.error);
        // Si es error de "no-speech", ignoramos. Si es "not-allowed", avisamos.
        if (event.error === 'not-allowed') {
            setIsListening(false);
            alert("Permiso de micrófono denegado.");
        }
      };

      recognition.onend = () => {
        // REINICIO AUTOMÁTICO (Truco para móviles)
        // Si el usuario NO le dio a "Parar", y se cortó solo, lo volvemos a prender.
        if (!isManuallyStopped.current && isListening) {
            try {
                recognition.start(); 
            } catch (e) {
                setIsListening(false);
            }
        } else {
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        setTranscript(''); // Limpiar al iniciar nueva
        try {
            recognitionRef.current.start();
        } catch(e) {
            console.log("Ya estaba activo");
        }
    } else {
        alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Safari.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        isManuallyStopped.current = true; // Marcamos que FUE MANUAL
        recognitionRef.current.stop();
    }
  }, []);

  return { isListening, transcript, interimTranscript, startListening, stopListening };
};