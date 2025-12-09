import { supabase } from '../lib/supabase';
import { eachDayOfInterval, isSameDay, parseISO, format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WeeklyStats {
  labels: string[]; 
  values: number[]; 
  rawCounts: number[]; 
  growth: number; 
}

export const AnalyticsService = {
  // ... (Mantén las funciones 1 y 2 de getInactivePatients y getDiagnosisTrends igual que antes) ...

  // Mantenemos las interfaces previas para evitar errores, solo pegas esto:
  async getInactivePatients(monthsThreshold: number = 6) { /* ...código anterior... */ return []; },
  async getDiagnosisTrends() { /* ...código anterior... */ return []; },

  // 3. ACTIVIDAD INTELIGENTE (Detecta dónde hay datos y se adapta)
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No auth");

      // 1. Truco Maestro: Pedimos las últimas 100 consultas SIN importar la fecha
      // Esto nos permite encontrar "dónde está la acción", sea hoy o en el futuro (2025)
      const { data, error } = await supabase
          .from('consultations')
          .select('created_at, status')
          .eq('doctor_id', user.id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false }) // Las más recientes primero
          .limit(100);

      if (error) throw error;

      // 2. Si no hay datos, devolvemos ceros
      if (!data || data.length === 0) {
          return { 
              labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
              values: [0,0,0,0,0,0,0], 
              rawCounts: [0,0,0,0,0,0,0], 
              growth: 0 
          };
      }

      // 3. Detectamos la "Fecha Ancla" (El último día que tuviste actividad)
      // Si tus datos son de Dic 2025, el sistema usará Dic 2025 como referencia.
      const lastActivityDate = new Date(data[0].created_at);
      
      // Definimos el rango: Desde 6 días antes hasta el día de la última actividad
      const end = endOfDay(lastActivityDate);
      const start = startOfDay(subDays(lastActivityDate, 6));

      console.log(`📊 Generando gráfica basada en datos encontrados: ${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`);

      // 4. Generamos los 7 días del intervalo
      const daysInterval = eachDayOfInterval({ start, end });
      
      // 5. Cruzamos los datos
      const rawCounts = daysInterval.map(day => {
          return data.filter(c => isSameDay(parseISO(c.created_at), day)).length;
      });

      // 6. Etiquetas dinámicas (L, M, M...)
      const labels = daysInterval.map(day => 
          format(day, 'eeeee', { locale: es }).toUpperCase()
      );

      // 7. Altura de barras (Normalización visual)
      const maxVal = Math.max(...rawCounts, 1);
      const values = rawCounts.map(c => Math.round((c / maxVal) * 100));

      return {
          labels,
          values,
          rawCounts,
          growth: 0 
      };

    } catch (e) {
      console.error("❌ Error Smart Analytics:", e);
      return { 
          labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
          values: [0,0,0,0,0,0,0], 
          rawCounts: [0,0,0,0,0,0,0], 
          growth: 0 
      };
    }
  }
};