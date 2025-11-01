-- Crear tabla para feedback de usuarios
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  user_name text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('issue', 'idea')),
  description text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  user_agent text,
  page_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'archived')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden crear su propio feedback
CREATE POLICY "Los usuarios pueden crear feedback" ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden ver su propio feedback
CREATE POLICY "Los usuarios pueden ver su propio feedback" ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los super_admins pueden ver todo el feedback
CREATE POLICY "Super admins pueden ver todo el feedback" ON feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Los super_admins pueden actualizar el feedback (cambiar status, agregar notas)
CREATE POLICY "Super admins pueden actualizar feedback" ON feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Comentarios
COMMENT ON TABLE feedback IS 'Almacena el feedback de los usuarios (problemas e ideas)';
COMMENT ON COLUMN feedback.feedback_type IS 'Tipo: issue (problema) o idea (sugerencia)';
COMMENT ON COLUMN feedback.status IS 'Estado: pending, reviewing, resolved, archived';
COMMENT ON COLUMN feedback.rating IS 'Calificación opcional de 1 a 5 estrellas';
COMMENT ON COLUMN feedback.admin_notes IS 'Notas internas del administrador';
