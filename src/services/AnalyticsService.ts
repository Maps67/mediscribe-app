import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  // 1. PACIENTES INACTIVOS (Sin cambios)
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

  // 2. TENDENCIAS (Sin cambios)
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

    return Object.keys(wordMap)
        .map(key => ({
            topic: key.charAt(0).toUpperCase() + key.slice(1),
            count: wordMap[key],
            percentage: Math.round((wordMap[key] / totalValidWords) * 100) * 5
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
  },

  // 🔴 3. ACTIVIDAD SEMANAL (VERSIÓN BYPASS SQL - CLIENT SIDE)
  // Esta versión NO usa RPC, usa SELECT normal que sabemos que funciona.
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No auth");

        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Lunes 00:00
        const end = endOfWeek(today, { weekStartsOn: 1 });     // Domingo 23:59

        console.log("📊 Consultando rango:", start.toISOString(), "->", end.toISOString());

        // CONSULTA DIRECTA (Infalible)
        const { data, error } = await supabase
            .from('consultations')
            .select('created_at') // Solo traemos la fecha, es muy ligero
            .eq('doctor_id', user.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .neq('status', 'cancelled'); // Ignoramos canceladas

        if (error) {
            console.error("❌ Error Supabase Select:", error);
            throw error;
        }

        console.log("✅ Consultas encontradas:", data?.length || 0);

        // PROCESAMIENTO LOCAL (Javascript)
        // Generamos los 7 días de la semana
        const daysInterval = eachDayOfInterval({ start, end });
        
        // Mapeamos Lunes a Domingo
        const rawCounts = daysInterval.map(day => {
            // Filtramos las consultas que coinciden con este día
            return data?.filter(c => isSameDay(parseISO(c.created_at), day)).length || 0;
        });

        // Etiquetas L, M, M...
        const labels = daysInterval.map(day => 
            format(day, 'eeeee', { locale: es }).toUpperCase()
        );

        // Altura de barras (Normalización)
        const maxVal = Math.max(...rawCounts, 1);
        const values = rawCounts.map(c => Math.round((c / maxVal) * 100));

        return {
            labels,
            values,
            rawCounts,
            growth: 0 
        };

    } catch (e) {
        console.error("Error crítico en AnalyticsService (Client-Side):", e);
        return { 
            labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
            values: [0,0,0,0,0,0,0], 
            rawCounts: [0,0,0,0,0,0,0], 
            growth: 0 
        };
    }
  }
};