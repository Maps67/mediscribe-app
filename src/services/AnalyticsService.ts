import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Interfaces (Tipado estricto para seguridad) ---
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
  labels: string[]; 
  values: number[]; 
  rawCounts: number[]; 
  growth: number; 
}

export const AnalyticsService = {

  // 1. PACIENTES INACTIVOS (Lógica original preservada)
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
        // Obtenemos la fecha más reciente de consulta
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
    // Retornamos los top 5 más antiguos
    return opportunities.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5);
  },

  // 2. TENDENCIAS (Lógica de palabras clave preservada)
  async getDiagnosisTrends(): Promise<DiagnosisTrend[]> {
    const { data: consultations } = await supabase
      .from('consultations')
      .select('summary')
      .limit(50)
      .order('created_at', { ascending: false });

    if (!consultations) return [];

    const wordMap: Record<string, number> = {};
    let totalValidWords = 0;
    // Palabras vacías a ignorar en el análisis
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'ante', 'con', 'en', 'por', 'para', 'y', 'o', 'que', 'se', 'su', 'sus', 'es', 'al', 'lo', 'no', 'si', 'paciente', 'refiere', 'presenta', 'acude', 'dolor', 'diagnostico', 'tratamiento', 'nota', 'clinica', 'soap', 'fecha', 'firma'];

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

    return Object.keys(wordMap)
        .map(key => ({
            topic: key.charAt(0).toUpperCase() + key.slice(1),
            count: wordMap[key],
            percentage: Math.round((wordMap[key] / totalValidWords) * 100) * 5
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
  },

  // 🔴 3. ACTIVIDAD SEMANAL (VERSIÓN CLIENT-SIDE BLINDADA)
  // Esta versión soluciona el problema de la gráfica vacía.
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const today = new Date();
        // Forzamos el inicio de semana al Lunes (weekStartsOn: 1)
        const start = startOfWeek(today, { weekStartsOn: 1 }); 
        const end = endOfWeek(today, { weekStartsOn: 1 });     

        // Consultamos solo las fechas, muy rápido y ligero
        const { data, error } = await supabase
            .from('consultations')
            .select('created_at') 
            .eq('doctor_id', user.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .neq('status', 'cancelled'); // Importante: ignorar canceladas

        if (error) throw error;

        // Si no hay datos, retornamos estructura vacía para evitar errores visuales
        if (!data || data.length === 0) {
            return { 
                labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
                values: [0,0,0,0,0,0,0], 
                rawCounts: [0,0,0,0,0,0,0], 
                growth: 0 
            };
        }

        // Generamos el intervalo de días para asegurar que el eje X siempre tenga 7 días
        const daysInterval = eachDayOfInterval({ start, end });
        
        // Mapeo Inteligente: Cruzamos los días generados con las fechas de la DB
        const rawCounts = daysInterval.map(day => {
            return data.filter(c => isSameDay(parseISO(c.created_at), day)).length;
        });

        // Generamos etiquetas (L, M, M...)
        const labels = daysInterval.map(day => 
            format(day, 'eeeee', { locale: es }).toUpperCase()
        );

        // Normalización visual (para que la gráfica se vea bonita aunque sean pocos datos)
        const maxVal = Math.max(...rawCounts, 1); // Evitamos división por cero
        const values = rawCounts.map(c => Math.round((c / maxVal) * 100));

        return {
            labels,
            values,
            rawCounts,
            growth: 0 // Placeholder para futura implementación
        };

    } catch (e) {
        console.error("⚠️ Error recuperando actividad:", e);
        // Fallback seguro para no romper el Dashboard
        return { 
            labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
            values: [0,0,0,0,0,0,0], 
            rawCounts: [0,0,0,0,0,0,0], 
            growth: 0 
        };
    }
  }
};