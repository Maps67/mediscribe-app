import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isIntentionalStop = useRef(false);

  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Navegador no compatible.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false; // CRÍTICO: false para reiniciar buffer en Android
    recognition.interimResults = true;
    recognition.lang = 'es-MX';

    recognition.onstart = () => {
      setIsListening(true);
      isIntentionalStop.current = false;
    };

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript;
        } else {
          interimChunk += event.results[i][0].transcript;
        }
      }

      if (finalChunk) {
        setTranscript((prev) => {
          const newText = `${prev} ${finalChunk}`.trim();
          return newText.charAt(0).toUpperCase() + newText.slice(1);
        });
        setInterimTranscript(''); 
      } else {
        setInterimTranscript(interimChunk);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setIsListening(false);
        setError('Permiso denegado.');
        isIntentionalStop.current = true;
      }
    };

    recognition.onend = () => {
      // Reinicia automáticamente si no fue una parada manual (Restart Pattern)
      if (!isIntentionalStop.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (e) { /* ignorar si ya inició */ }
        }, 100); 
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;
    return () => { if (recognitionRef.current) recognitionRef.current.abort(); };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    isIntentionalStop.current = false;
    try { recognitionRef.current?.start(); } catch (e) { console.error(e); }
  }, []);

  const stopListening = useCallback(() => {
    isIntentionalStop.current = true;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript, error };
};