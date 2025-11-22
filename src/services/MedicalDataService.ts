import { supabase } from '../lib/supabase';
import { Patient, Consultation, Appointment } from '../types';

export class MedicalDataService {
  
  // --- PACIENTES ---

  static async searchPatients(query: string): Promise<Patient[]> {
    if (!query || query.length < 2) return [];
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5);
    if (error) { console.error("Error búsqueda:", error); return []; }
    return data || [];
  }

  static async getPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'doctor_id'>): Promise<Patient> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa.");
    const { data, error } = await supabase
      .from('patients')
      .insert([{ ...patient, doctor_id: session.user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deletePatient(id: string): Promise<void> {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error;
  }

  // --- CONSULTAS ---

  static async createConsultation(consultation: Omit<Consultation, 'id' | 'created_at' | 'doctor_id'>): Promise<Consultation> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No sesión.");
    const { data, error } = await supabase
      .from('consultations')
      .insert([{ ...consultation, doctor_id: session.user.id }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // --- NUEVO: CITAS (AGENDA) ---

  static async getAppointments(): Promise<Appointment[]> {
    // Traemos las citas y "unimos" (join) con la tabla pacientes para saber el nombre
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*)') 
      .gte('date_time', new Date().toISOString()) // Solo citas futuras o de hoy en adelante
      .order('date_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'doctor_id' | 'patients'>): Promise<Appointment> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No sesión.");

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...appointment, doctor_id: session.user.id }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  static async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  }
}