import { supabase } from '../lib/supabase';

export interface InactivePatient {
  id: string;
  name: string;
  phone: string | null;
  lastVisit: string;
  daysSince: number;
}

export interface DiagnosisTrend {
  topic: string;
  count: number;
  percentage: number;
}

export const AnalyticsService = {

  // 1. DETECTAR PACIENTES INACTIVOS (Oportunidad de Venta)
  async getInactivePatients(monthsThreshold: number = 6): Promise<InactivePatient[]> {
    // a. Traer todos los pacientes y sus consultas
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, name, phone, created_at, consultations(created_at)');

    if (error || !patients) return [];

    const now = new Date();
    const opportunities: InactivePatient[] = [];

    patients.forEach(patient => {
      // Obtener fecha de última consulta
      let lastDate = new Date(patient.created_at); // Por defecto, fecha de registro
      
      if (patient.consultations && patient.consultations.length > 0) {
        // Ordenar para encontrar la más reciente
        const dates = patient.consultations.map((c: any) => new Date(c.created_at).getTime());
        lastDate = new Date(Math.max(...dates));
      }

      // Calcular diferencia en meses
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30;

      // Si pasó el umbral, es una oportunidad
      if (diffMonths >= monthsThreshold) {
        opportunities.push({
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          lastVisit: lastDate.toLocaleDateString(),
          daysSince: diffDays
        });
      }
    });

    // Retornar los 5 con más tiempo sin venir
    return opportunities.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5);
  },

  // 2. ANALIZAR TENDENCIAS (Minería de Texto Básica)
  async getDiagnosisTrends(): Promise<DiagnosisTrend[]> {
    // Traemos las últimas 50 consultas para analizar tendencias recientes
    const { data: consultations } = await supabase
      .from('consultations')
      .select('summary')
      .limit(50)
      .order('created_at', { ascending: false });

    if (!consultations) return [];

    const wordMap: Record<string, number> = {};
    let totalValidWords = 0;

    // Palabras comunes a ignorar
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'ante', 'con', 'en', 'por', 'para', 'y', 'o', 'que', 'se', 'su', 'sus', 'es', 'al', 'lo', 'no', 'si', 'paciente', 'refiere', 'presenta', 'acude', 'dolor', 'diagnostico', 'tratamiento', 'nota', 'clinica', 'soap'];

    consultations.forEach(c => {
        if (!c.summary) return;
        // Limpieza básica: minúsculas, quitar puntuación
        const words = c.summary.toLowerCase()
            .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
            .split(/\s+/);

        words.forEach(word => {
            if (word.length > 3 && !stopWords.includes(word)) {
                wordMap[word] = (wordMap[word] || 0) + 1;
                totalValidWords++;
            }
        });
    });

    // Convertir a array y ordenar
    const trends = Object.keys(wordMap)
        .map(key => ({
            topic: key.charAt(0).toUpperCase() + key.slice(1), // Capitalizar
            count: wordMap[key],
            percentage: Math.round((wordMap[key] / totalValidWords) * 100) * 5 // Multiplicador visual
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4); // Top 4 temas

    return trends;
  }
};