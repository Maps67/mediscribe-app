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

  // 🔴 3. ACTIVIDAD SEMANAL (CORREGIDO Y BLINDADO)
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
        const today = new Date();
        // Forzamos inicio Lunes 00:00 y fin Domingo 23:59
        const start = startOfWeek(today, { weekStartsOn: 1 }); 
        const end = endOfWeek(today, { weekStartsOn: 1 });

        console.log("📊 Consultando actividad:", { 
            start: start.toISOString(), 
            end: end.toISOString() 
        });

        const { data, error } = await supabase.rpc('get_weekly_activity_counts', {
            start_date: start.toISOString(),
            end_date: end.toISOString()
        });

        if (error) {
            console.error("❌ Error RPC Supabase:", error);
            throw error;
        }

        console.log("✅ Datos crudos de DB:", data);

        // Inicializar array de 7 días (Lunes=0 ... Domingo=6)
        const rawCounts = [0, 0, 0, 0, 0, 0, 0];

        if (data && Array.isArray(data)) {
            data.forEach((item: any) => {
                // Asegurar conversión a número
                const dayIndex = Number(item.day_index); // SQL devuelve 1..7
                const count = Number(item.total_count);

                // Mapeo: SQL(1)=Lunes -> Array(0)
                const arrayPos = dayIndex - 1;

                if (arrayPos >= 0 && arrayPos < 7) {
                    rawCounts[arrayPos] = count;
                }
            });
        }

        console.log("📈 Conteos procesados:", rawCounts);

        // Calcular alturas relativas (evitando división por cero)
        const maxVal = Math.max(...rawCounts);
        const values = rawCounts.map(c => maxVal === 0 ? 0 : Math.round((c / maxVal) * 100));

        return {
            labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
            values,
            rawCounts,
            growth: 0 
        };

    } catch (e) {
        console.error("Error crítico en AnalyticsService:", e);
        return { 
            labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
            values: [0,0,0,0,0,0,0], 
            rawCounts: [0,0,0,0,0,0,0], 
            growth: 0 
        };
    }
  }
};