/*
  # Actualizar políticas RLS para que super_admin vea todos los usuarios

  1. Cambios
    - Actualizar política de SELECT en users para permitir que super_admin y admin vean todos los usuarios
    - Mantener que usuarios normales solo vean su propio perfil

  2. Seguridad
    - Super admins pueden ver todos los usuarios
    - Admins pueden ver todos los usuarios
    - Usuarios normales solo ven su propio perfil
*/

-- Eliminar política existente de SELECT
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON users;

-- Crear nueva política de SELECT que permita a super_admin y admin ver todos
CREATE POLICY "Usuarios pueden ver perfiles según su rol"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Super admins y admins ven todos
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('super_admin', 'admin')
    )
    OR
    -- Usuarios normales solo ven su propio perfil
    id = auth.uid()
  );
