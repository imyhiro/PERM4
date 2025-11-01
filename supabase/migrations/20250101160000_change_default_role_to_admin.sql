/*
  Cambiar rol por defecto de nuevos usuarios a 'admin'

  Los nuevos usuarios deben poder crear análisis de riesgos,
  pero con las limitantes de su plan FREE (1 org, 3 sitios)
*/

-- Actualizar función para crear perfil de usuario automáticamente
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
    -- Nuevos usuarios son 'admin' con limitantes de plan FREE
    default_role := 'admin';
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

-- Comentario
COMMENT ON FUNCTION public.handle_new_user() IS 'Crea perfil de usuario automáticamente: super_admin para el primero, admin para los demás';
