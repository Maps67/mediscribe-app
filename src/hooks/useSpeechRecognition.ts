import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const isManuallyStopped = useRef(false);

  useEffect(() => {
    // Detección de API (Chrome/Safari/Edge)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onstart = () => {
        setIsListening(true);
        isManuallyStopped.current = false;
      };

      recognition.onresult = (event: any) => {
        // SOLUCIÓN TEXTO DUPLICADO:
        // En lugar de sumar (+=), reconstruimos la frase completa cada vez
        // basándonos en lo que el navegador tiene en memoria en este momento.
        
        let finalTranscript = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimStr += result[0].transcript;
          }
        }

        // Actualizamos el estado con la versión limpia
        // Nota: En Android 'continuous' a veces limpia el buffer, 
        // si notas que borra texto anterior, avísame para activar el modo "Append Seguro".
        // Por ahora, este modo "Full Rebuild" elimina los duplicados del video.
        setTranscript(finalTranscript);
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        // Ignoramos error 'no-speech' que es común en silencios
        if (event.error !== 'no-speech') {
            console.error("Error voz:", event.error);
        }
      };

      recognition.onend = () => {
        if (isListening && !isManuallyStopped.current) {
            try {
                recognition.start(); // Reinicio automático
            } catch (e) {
                // Si falla el reinicio, paramos
                setIsListening(false);
            }
        } else {
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isListening]); // Agregamos dependencia para reinicio

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        // Limpiamos al iniciar una nueva sesión manual
        setTranscript(''); 
        setInterimTranscript('');
        try {
            recognitionRef.current.start();
        } catch(e) {
            console.log("Micrófono ya activo");
        }
    } else {
        alert("Navegador no compatible.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        isManuallyStopped.current = true;
        recognitionRef.current.stop();
    }
  }, []);

  return { isListening, transcript, interimTranscript, startListening, stopListening };
};