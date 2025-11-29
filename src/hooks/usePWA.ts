import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está instalada
    const checkStandalone = () => {
      const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(isApp);
    };
    
    // 2. Detectar iOS
    const checkIOS = () => {
      const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isDeviceIOS);
    };

    checkStandalone();
    checkIOS();

    // 3. Capturar el evento de instalación (CRÍTICO)
    const handler = (e: Event) => {
      e.preventDefault(); // Evitar que Chrome muestre su mini-barra automática
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log("📲 Evento de instalación capturado exitosamente");
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
        if (isIOS) return 'ios_instruction'; // Retorno especial para mostrar instrucciones iOS
        return 'failed';
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      return 'accepted';
    }
    return 'dismissed';
  };

  return { isStandalone, isIOS, installPWA, canInstall: !!deferredPrompt };
}