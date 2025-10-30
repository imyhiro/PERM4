/*
  # Crear perfiles de usuario automáticamente

  1. Cambios
    - Crear función que se ejecute cuando se cree un usuario en auth.users
    - Asignar automáticamente el primer usuario como super_admin
    - Los siguientes usuarios serán 'reader' por defecto
    - Crear trigger para ejecutar la función automáticamente

  2. Seguridad
    - La función se ejecuta con privilegios de seguridad
    - Solo se puede ejecutar automáticamente por el sistema
*/

-- Crear función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  default_role text;
BEGIN
  -- Contar cuántos usuarios existen
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Si es el primer usuario, hacerlo super_admin
  IF user_count = 0 THEN
    default_role := 'super_admin';
  ELSE
    default_role := 'reader';
  END IF;

  -- Crear el perfil del usuario
  INSERT INTO public.users (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger que se ejecute cuando se cree un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insertar perfil para usuarios existentes que no tengan perfil
INSERT INTO public.users (id, email, full_name, role, organization_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM public.users) THEN 'super_admin'
    ELSE 'reader'
  END,
  NULL
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;