-- ARCHIVO DE RESPALDO: CONFIGURACIÓN DE REGISTRO BLINDADO
-- PROYECTO: MediScribe AI
-- ESTADO: Stable v2.0 - SEGURIDAD CRITICA

-- 1. Políticas de Seguridad (RLS) para Doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura Publica Doctores" ON public.doctors;
CREATE POLICY "Lectura Publica Doctores" ON public.doctors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert Propio Doctors" ON public.doctors;
CREATE POLICY "Insert Propio Doctors" ON public.doctors FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Update Propio Doctors" ON public.doctors;
CREATE POLICY "Update Propio Doctors" ON public.doctors FOR UPDATE USING (auth.uid() = id);

-- 2. Políticas de Seguridad (RLS) para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura Propia Profiles" ON public.profiles;
CREATE POLICY "Lectura Propia Profiles" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert Propio Profiles" ON public.profiles;
CREATE POLICY "Insert Propio Profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Update Propio Profiles" ON public.profiles;
CREATE POLICY "Update Propio Profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. TRIGGER AUTOMATIZADO (El motor del registro)
CREATE OR REPLACE FUNCTION public.handle_new_user_automatizado()
RETURNS trigger AS $$
BEGIN
  -- Insertar en PROFILES
  INSERT INTO public.profiles (id, email, full_name, specialty, license_number)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'specialty', 
    new.raw_user_meta_data->>'cedula'
  );

  -- Insertar en DOCTORS
  INSERT INTO public.doctors (id, email, full_name, specialty, license_id, is_verified)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'specialty', 
    new.raw_user_meta_data->>'cedula', 
    false
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reinicio del Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_automatizado ON auth.users;
CREATE TRIGGER on_auth_user_created_automatizado
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_automatizado();