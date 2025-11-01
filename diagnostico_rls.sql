-- Diagnóstico de políticas RLS para tabla users
-- Ejecuta esto en Supabase SQL Editor para verificar permisos

-- 1. Verificar si RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 2. Ver todas las políticas de la tabla users
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 3. Probar que puedes leer tu propio perfil
-- Reemplaza con tu user ID
SELECT * FROM users WHERE id = '8bb25de0-6acb-46f5-9d12-7f3410419c6f';

-- 4. Verificar que auth.uid() funciona correctamente
SELECT auth.uid();
