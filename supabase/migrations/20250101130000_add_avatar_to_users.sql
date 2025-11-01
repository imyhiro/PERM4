-- Agregar campo avatar_url a la tabla users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comentario para documentar el campo
COMMENT ON COLUMN users.avatar_url IS 'URL de la foto de perfil del usuario (puede ser de Supabase Storage o URL externa)';
