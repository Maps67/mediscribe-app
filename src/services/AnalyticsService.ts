import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek } from 'date-fns';

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

export interface WeeklyStats {
  labels: string[]; // ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  values: number[]; // Altura porcentual para el gráfico (0-100)
  rawCounts: number[]; // Cantidad real de pacientes (tooltip)
  growth: number; 
}

export const AnalyticsService = {

  // 1. DETECTAR PACIENTES INACTIVOS (Oportunidad de Venta)
  async getInactivePatients(monthsThreshold: number = 6): Promise<InactivePatient[]> {
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, name, phone, created_at, consultations(created_at)');

    if (error || !patients) return [];

    const now = new Date();
    const opportunities: InactivePatient[] = [];

    patients.forEach(patient => {
      let lastDate = new Date(patient.created_at);
      
      if (patient.consultations && patient.consultations.length > 0) {
        const dates = patient.consultations.map((c: any) => new Date(c.created_at).getTime());
        lastDate = new Date(Math.max(...dates));
      }

      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30;

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

    return opportunities.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5);
  },

  // 2. ANALIZAR TENDENCIAS (Minería de Texto Básica)
  async getDiagnosisTrends(): Promise<DiagnosisTrend[]> {
    const { data: consultations } = await supabase
      .from('consultations')
      .select('summary')
      .limit(50)
      .order('created_at', { ascending: false });

    if (!consultations) return [];

    const wordMap: Record<string, number> = {};
    let totalValidWords = 0;
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'ante', 'con', 'en', 'por', 'para', 'y', 'o', 'que', 'se', 'su', 'sus', 'es', 'al', 'lo', 'no', 'si', 'paciente', 'refiere', 'presenta', 'acude', 'dolor', 'diagnostico', 'tratamiento', 'nota', 'clinica', 'soap'];

    consultations.forEach(c => {
        if (!c.summary) return;
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

    const trends = Object.keys(wordMap)
        .map(key => ({
            topic: key.charAt(0).toUpperCase() + key.slice(1),
            count: wordMap[key],
            percentage: Math.round((wordMap[key] / totalValidWords) * 100) * 5
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

    return trends;
  },

  // 🔴 3. ACTIVIDAD SEMANAL REAL (CONECTADO A SQL RPC)
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
        const today = new Date();
        // Definimos la semana actual (Lunes a Domingo)
        const start = startOfWeek(today, { weekStartsOn: 1 }); 
        const end = endOfWeek(today, { weekStartsOn: 1 });

        // LLAMADA A LA FUNCIÓN BLINDADA EN SUPABASE
        const { data, error } = await supabase.rpc('get_weekly_activity_counts', {
            start_date: start.toISOString(),
            end_date: end.toISOString()
        });

        if (error) throw error;

        // Inicializamos array de 7 ceros (Lunes a Domingo)
        // Índice 0 = Lunes, 6 = Domingo
        const rawCounts = [0, 0, 0, 0, 0, 0, 0];

        // Mapeamos los resultados de la DB al array
        // La DB devuelve day_index: 1 (Lunes) ... 7 (Domingo)
        if (data) {
            (data as any[]).forEach(item => {
                const arrayIndex = item.day_index - 1; // Ajustamos a base 0
                if (arrayIndex >= 0 && arrayIndex < 7) {
                    rawCounts[arrayIndex] = Number(item.total_count);
                }
            });
        }

        // Calcular porcentaje relativo para la altura visual de las barras
        const maxVal = Math.max(...rawCounts, 1); // Evitamos dividir por cero
        const values = rawCounts.map(count => Math.round((count / maxVal) * 100));

        return {
            labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
            values,     // Para CSS height
            rawCounts,  // Para tooltip (número real)
            growth: 0   // Pendiente para V6.0
        };

    } catch (e) {
        console.error("Error en Analytics RPC:", e);
        // Fallback silencioso para no romper UI
        return { 
            labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
            values: [0,0,0,0,0,0,0], 
            rawCounts: [0,0,0,0,0,0,0], 
            growth: 0 
        };
    }
  }
};