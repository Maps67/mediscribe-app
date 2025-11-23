import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

export const AppointmentService = {
  
  // Obtener citas (con join para saber el nombre del paciente)
  async getAppointments(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(name)
      `)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear nueva cita
  async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar cita (reprogramar o cambiar estado)
  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Eliminar cita
  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};