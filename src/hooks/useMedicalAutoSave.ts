import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Definimos qué datos queremos salvar
interface AutoSaveData {
  transcript: string;
  generatedNote: any;
  editableInstructions: string;
  editablePrescriptions: any[];
  activeSpeaker: 'doctor' | 'patient';
}

export const useMedicalAutoSave = (userId: string | null) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Clave única por usuario para no mezclar borradores entre médicos
  const STORAGE_KEY = userId ? `vitalscribe_autosave_${userId}` : null;

  // 1. FUNCIÓN DE GUARDADO (Persistencia)
  const saveData = useCallback((data: AutoSaveData) => {
    if (!STORAGE_KEY) return;
    
    try {
      const serialized = JSON.stringify({
        timestamp: Date.now(),
        data: data
      });
      localStorage.setItem(STORAGE_KEY, serialized);
      setLastSaved(new Date());
    } catch (e) {
      console.warn("AutoSave: Memoria llena o error de escritura", e);
    }
  }, [STORAGE_KEY]);

  // 2. FUNCIÓN DE CARGA (Rehidratación)
  const loadData = useCallback((): AutoSaveData | null => {
    if (!STORAGE_KEY) return null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      
      // Opcional: Podríamos validar si el borrador es muy viejo (ej. > 24 horas) para descartarlo
      const hoursDiff = (Date.now() - parsed.timestamp) / 1000 / 60 / 60;
      if (hoursDiff > 24) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed.data as AutoSaveData;
    } catch (e) {
      console.error("AutoSave: Error leyendo datos", e);
      return null;
    }
  }, [STORAGE_KEY]);

  // 3. FUNCIÓN DE LIMPIEZA (Al terminar consulta)
  const clearData = useCallback(() => {
    if (!STORAGE_KEY) return;
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
  }, [STORAGE_KEY]);

  return { saveData, loadData, clearData, lastSaved };
};