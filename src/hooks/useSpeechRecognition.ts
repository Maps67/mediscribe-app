import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const isManuallyStopped = useRef(false);
  
  // Acumulador seguro de texto (La "Memoria" que nosotros controlamos, no el navegador)
  const persistentTranscript = useRef(''); 

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // DETECCIÓN DE MÓVIL
      // Si es móvil, desactivamos continuous para forzar limpieza de buffer
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      recognition.continuous = !isMobile; // PC: True (Continuo), Móvil: False (Frase por frase)
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onstart = () => {
        setIsListening(true);
        isManuallyStopped.current = false;
      };

      recognition.onresult = (event: any) => {
        let newInterim = '';
        let newFinal = '';

        // Si es PC (Continuous), la lógica es estándar
        // Si es Móvil (No Continuous), el evento siempre trae texto fresco
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript + ' ';
          } else {
            newInterim += event.results[i][0].transcript;
          }
        }

        if (newFinal) {
            // En móvil, acumulamos manualmente porque el navegador olvida al reiniciar
            persistentTranscript.current += newFinal; 
            setTranscript(persistentTranscript.current);
        }
        
        setInterimTranscript(newInterim);
      };

      recognition.onerror = (event: any) => {
        // Ignoramos errores silenciosos
        if (event.error !== 'no-speech') {
            console.warn("Speech warning:", event.error);
        }
      };

      recognition.onend = () => {
        // EL TRUCO MAGICO:
        // Si se cortó solo (porque terminó la frase en móvil) y NO lo paramos nosotros...
        // ... LO REINICIAMOS INMEDIATAMENTE.
        if (!isManuallyStopped.current) {
            try {
                recognition.start();
            } catch (e) {
                // Si falla el reinicio inmediato, esperamos un poco
                setTimeout(() => {
                    if (!isManuallyStopped.current) recognition.start();
                }, 100);
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
        persistentTranscript.current = ''; // Resetear memoria nuestra
        setTranscript('');
        setInterimTranscript('');
        isManuallyStopped.current = false;
        try {
            recognitionRef.current.start();
        } catch(e) { console.log("Ya activo"); }
    } else {
        alert("Navegador no compatible.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        isManuallyStopped.current = true; // Bandera roja: NO REINICIAR
        recognitionRef.current.stop();
        setIsListening(false);
    }
  }, []);

  return { isListening, transcript, interimTranscript, startListening, stopListening };
};

export default useSpeechRecognition;