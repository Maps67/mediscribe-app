import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

export const AppointmentService = {
  
  // Obtener citas
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

  // Crear nueva cita (CORREGIDO: Inyecta doctor_id explícitamente)
  async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    // 1. Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    // 2. Insertar asegurando el doctor_id
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ 
        ...appointment, 
        doctor_id: user.id 
      }])
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error);
      throw error;
    }
    return data;
  },

  // Actualizar cita
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