import { supabase } from '../lib/supabase';
// Importamos solo lo necesario para formateo visual, la lógica será nativa
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Interfaces Originales ---
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

  // =================================================================
  // 1. PACIENTES INACTIVOS (CÓDIGO ORIGINAL RESTAURADO)
  // =================================================================
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

  // =================================================================
  // 2. TENDENCIAS (CÓDIGO ORIGINAL RESTAURADO)
  // =================================================================
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

  // =================================================================
  // 3. ACTIVIDAD SEMANAL (PLAN A: LÓGICA NATIVA DE TEXTO + ANCLAJE)
  // =================================================================
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return emptyStats();

        // 1. Traemos las últimas 100 consultas (Datos Crudos)
        // Pedimos muchas para encontrar tus datos de Diciembre 2025
        const { data, error } = await supabase
            .from('consultations')
            .select('created_at')
            .eq('doctor_id', user.id)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error || !data || data.length === 0) return emptyStats();

        // 2. DEFINIR EL "HOY" DE LA GRÁFICA
        // En lugar de usar la fecha de la computadora, usamos la fecha del ÚLTIMO DATO encontrado.
        // Si tu último paciente fue el 9 de Dic 2025, la gráfica terminará el 9 de Dic 2025.
        const anchorDate = new Date(data[0].created_at); // Fecha del registro más reciente

        const counts = [0, 0, 0, 0, 0, 0, 0];
        const labels = [];

        // 3. Loop de 7 días hacia atrás desde la fecha ancla
        for (let i = 6; i >= 0; i--) {
            const d = new Date(anchorDate);
            d.setDate(anchorDate.getDate() - i);
            
            // Etiqueta visual: "LUN", "MAR"
            const dayName = format(d, 'eeeee', { locale: es }).toUpperCase();
            labels.push(dayName);

            // CLAVE DEL PLAN A: Convertimos a string "YYYY-MM-DD" local
            // Esto evita cualquier error de hora o zona horaria. Coincidencia exacta.
            // Usamos 'sv' (Suecia) porque da formato ISO yyyy-mm-dd estándar
            const targetDateString = d.toLocaleDateString('sv'); 

            // Filtramos contando coincidencias de texto
            const count = data.filter(item => {
                const itemDateString = new Date(item.created_at).toLocaleDateString('sv');
                return itemDateString === targetDateString;
            }).length;

            counts[6 - i] = count; 
        }

        // 4. Calcular Alturas
        const maxVal = Math.max(...counts, 1);
        const values = counts.map(c => Math.round((c / maxVal) * 100));

        return {
            labels,
            values,
            rawCounts: counts,
            growth: 0 
        };

    } catch (e) {
        console.error("Error en WeeklyActivity:", e);
        return emptyStats();
    }
  }
};

// Helper seguro para retornar vacío sin romper la app
const emptyStats = (): WeeklyStats => ({
  labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  values: [0,0,0,0,0,0,0],
  rawCounts: [0,0,0,0,0,0,0], 
  growth: 0 
});