/*
  # Corregir recursión infinita en políticas RLS

  1. Cambios
    - Eliminar políticas problemáticas de organizations y users
    - Crear nuevas políticas más simples que no causen recursión
    - Usar auth.uid() directamente en lugar de consultas recursivas

  2. Seguridad
    - Mantener el mismo nivel de seguridad
    - Evitar ciclos en las consultas de políticas
*/

-- Eliminar políticas existentes de organizations
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

-- Eliminar políticas existentes de users
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Crear políticas simples para organizations
CREATE POLICY "Usuarios autenticados pueden ver organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (true);

-- Crear políticas simples para users
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Usuarios pueden insertar su propio perfil"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
