-- VERIFICACIÓN RÁPIDA - Ejecuta esto en Supabase SQL Editor
-- Esto te dirá exactamente qué está fallando

-- 1. ¿Puedes ver la tabla users?
SELECT COUNT(*) as total_users FROM users;

-- 2. ¿Tus nuevas columnas existen?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('license_type', 'site_limit', 'org_limit', 'license_status');

-- 3. ¿Puedes ver tu propio perfil? (con el email que usas para login)
SELECT
  id,
  email,
  full_name,
  role,
  license_type,
  site_limit,
  org_limit
FROM users
WHERE email = 'egarcia@girorm.mx';  -- Reemplaza con tu email si es otro

-- 4. Si las 3 queries anteriores funcionan, el problema es en el frontend
-- Si alguna falla, el problema es en la base de datos

-- 5. SOLUCIÓN TEMPORAL: Dar permisos de lectura a todos los campos
-- (Solo si las queries anteriores fallan)
-- GRANT SELECT ON users TO authenticated;
