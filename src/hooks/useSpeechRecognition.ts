import { useCallback, useEffect, useRef, useState } from 'react';

// Opciones del hook (con defaults inteligentes)
type HookOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
};

export const useSpeechRecognition = (options?: HookOptions) => {
  const {
    lang = 'es-MX',
    continuous = true,
    interimResults = true,
  } = options || {};

  // Estados compatibles con tu vista actual
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState(''); // Lo mantenemos aunque esté vacío a veces

  // Referencias internas para la lógica anti-duplicados
  const recognitionRef = useRef<any>(null);
  const finalsRef = useRef<Map<number, string>>(new Map());
  const interimsRef = useRef<Map<number, string>>(new Map());
  const lastCombinedRef = useRef<string>('');
  const isManuallyStopped = useRef(false);

  // Helper: Acceso seguro a la API
  const getSpeechRecognition = useCallback(() => {
    const win = window as any;
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }, []);

  // Lógica de fusión inteligente (Evita el "hola hola hola")
  const buildTranscript = () => {
    const allIndexes = new Set<number>();
    finalsRef.current.forEach((_, k) => allIndexes.add(k));
    interimsRef.current.forEach((_, k) => allIndexes.add(k));
    
    const sortedIndexes = Array.from(allIndexes).sort((a, b) => a - b);
    
    const finalParts: string[] = [];
    const interimParts: string[] = [];

    sortedIndexes.forEach(idx => {
      const f = finalsRef.current.get(idx);
      if (f) finalParts.push(f.trim());
      
      const i = interimsRef.current.get(idx);
      if (i) interimParts.push(i.trim());
    });

    // Texto final consolidado
    const fullFinal = finalParts.join(' ').trim();
    // Texto temporal actual
    const fullInterim = interimParts.join(' ').trim();

    return { fullFinal, fullInterim };
  };

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      alert("Navegador no compatible con voz.");
      return;
    }

    // Limpiar estado anterior
    finalsRef.current.clear();
    interimsRef.current.clear();
    setTranscript('');
    setInterimTranscript('');
    isManuallyStopped.current = false;

    try {
      const recognition = new SR();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      
      recognition.onend = () => {
        // Auto-reinicio para móviles (si no se paró manual)
        if (!isManuallyStopped.current) {
            try {
                recognition.start();
            } catch(e) {
                setIsListening(false);
            }
        } else {
            setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.log("Error voz:", event.error);
      };

      recognition.onresult = (event: any) => {
        // Algoritmo Anti-Bucle Android
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            const txt = res[0].transcript;
            
            if (res.isFinal) {
                finalsRef.current.set(i, txt);
                interimsRef.current.delete(i); // Ya es final, borramos interim
            } else {
                interimsRef.current.set(i, txt);
            }
        }

        const { fullFinal, fullInterim } = buildTranscript();
        
        // Solo actualizamos si cambió algo para evitar re-renders infinitos
        if (fullFinal !== lastCombinedRef.current) {
            setTranscript(fullFinal);
            lastCombinedRef.current = fullFinal;
        }
        setInterimTranscript(fullInterim);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (e) {
      console.error("Error iniciando:", e);
    }
  }, [getSpeechRecognition, lang, continuous, interimResults]);

  const stopListening = useCallback(() => {
    isManuallyStopped.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignorar si ya estaba parado
      }
    }
    setIsListening(false);
  }, []);

  // Retornamos la interfaz exacta que tu componente ya usa
  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening
  };
};

export default useSpeechRecognition;