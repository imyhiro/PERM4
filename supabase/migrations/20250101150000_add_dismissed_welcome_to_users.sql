-- Agregar campo para controlar si el usuario ya vio el mensaje de bienvenida
ALTER TABLE users
ADD COLUMN dismissed_welcome boolean NOT NULL DEFAULT false;

-- Índice para consultas eficientes
CREATE INDEX idx_users_dismissed_welcome ON users(dismissed_welcome);

-- Comentario
COMMENT ON COLUMN users.dismissed_welcome IS 'Indica si el usuario ya vio y descartó el modal de bienvenida';
