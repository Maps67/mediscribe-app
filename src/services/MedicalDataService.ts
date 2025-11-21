// IMPORTANTE: Esta ruta '../lib/supabase' ahora sí existirá
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';

export class MedicalDataService {
  
  // --- CONSULTAS ---

  static async createConsultation(
    consultation: Omit<Consultation, 'id' | 'created_at' | 'doctor_id'>
  ): Promise<Consultation> {
    // 1. Verificamos sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    
    // Si no hay sesión (ej. recargaste página y se perdió), lanzamos error
    if (!session) throw new Error("No hay sesión activa. Usuario no autenticado.");

    // 2. Insertamos asegurando el doctor_id
    const { data, error } = await supabase
      .from('consultations')
      .insert([{
        ...consultation,
        doctor_id: session.user.id 
      }])
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error);
      throw new Error(error.message);
    }
    return data;
  }

  // --- PACIENTES ---

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
      .insert([{
        ...patient,
        doctor_id: session.user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
  
  // Método auxiliar para cerrar sesión
  async signOut() {
    await supabase.auth.signOut();
  }
  
  // Getter para acceder al cliente directamente si hace falta
  get supabase() {
    return supabase;
  }
}