# 💬 SISTEMA DE FEEDBACK - INSTRUCCIONES

## ✅ Lo que ya está implementado:

- ✓ Componente FeedbackModal con diseño tipo Supabase
- ✓ Botón "Feedback" en el header
- ✓ Tabla feedback con políticas RLS
- ✓ TypeScript types completos
- ✓ Código committed al repositorio

## 🚀 Para activar el sistema:

### 1. Aplicar migración SQL en Supabase

Ve a **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
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
```

### 2. Verificar instalación

```sql
-- Verificar tabla
SELECT COUNT(*) FROM feedback;

-- Verificar políticas
SELECT policyname FROM pg_policies WHERE tablename = 'feedback';
```

## 🎨 Cómo funciona el sistema:

### Para usuarios:

1. **Abrir modal de feedback:**
   - Click en botón "Feedback" en el header (izquierda de los logos circulares)

2. **Elegir tipo de feedback:**
   - 🚨 **Problema**: Reportar un error o bug
   - 💡 **Idea**: Sugerir una mejora o nueva funcionalidad

3. **Completar formulario:**
   - Descripción detallada (obligatorio)
   - Calificación con estrellas (opcional, 1-5)
   - Se captura automáticamente:
     - User Agent (navegador)
     - URL de la página
     - Información del usuario

4. **Enviar:**
   - Click en "Enviar Feedback"
   - Confirmación de envío exitoso
   - Modal se cierra automáticamente

### Para administradores (Super Admin):

1. **Ver todo el feedback:**
   ```sql
   SELECT
     feedback_type,
     user_name,
     user_email,
     description,
     rating,
     status,
     created_at
   FROM feedback
   ORDER BY created_at DESC;
   ```

2. **Filtrar por tipo:**
   ```sql
   -- Solo problemas
   SELECT * FROM feedback WHERE feedback_type = 'issue' ORDER BY created_at DESC;

   -- Solo ideas
   SELECT * FROM feedback WHERE feedback_type = 'idea' ORDER BY created_at DESC;
   ```

3. **Filtrar por estado:**
   ```sql
   -- Pendientes
   SELECT * FROM feedback WHERE status = 'pending' ORDER BY created_at DESC;

   -- En revisión
   SELECT * FROM feedback WHERE status = 'reviewing' ORDER BY created_at DESC;

   -- Resueltos
   SELECT * FROM feedback WHERE status = 'resolved' ORDER BY created_at DESC;
   ```

4. **Actualizar estado y agregar notas:**
   ```sql
   UPDATE feedback
   SET
     status = 'resolved',
     admin_notes = 'Corregido en versión 1.2.3'
   WHERE id = 'uuid-del-feedback';
   ```

5. **Estadísticas:**
   ```sql
   -- Resumen por tipo
   SELECT
     feedback_type,
     COUNT(*) as total,
     AVG(rating) as rating_promedio
   FROM feedback
   GROUP BY feedback_type;

   -- Resumen por estado
   SELECT
     status,
     COUNT(*) as total
   FROM feedback
   GROUP BY status;

   -- Feedback más reciente
   SELECT * FROM feedback ORDER BY created_at DESC LIMIT 10;
   ```

## 📊 Campos de la tabla feedback:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | ID único del feedback |
| user_id | uuid | ID del usuario (null si se elimina el usuario) |
| user_email | text | Email del usuario |
| user_name | text | Nombre completo del usuario |
| feedback_type | text | "issue" (problema) o "idea" (sugerencia) |
| description | text | Descripción detallada |
| rating | integer | Calificación de 1-5 estrellas (opcional) |
| user_agent | text | Navegador del usuario |
| page_url | text | URL donde se envió el feedback |
| status | text | pending, reviewing, resolved, archived |
| admin_notes | text | Notas internas del administrador |
| created_at | timestamptz | Fecha de creación |
| updated_at | timestamptz | Última actualización (auto) |

## 🔐 Políticas de seguridad (RLS):

- ✅ Usuarios autenticados pueden crear feedback
- ✅ Usuarios pueden ver solo su propio feedback
- ✅ Super admins pueden ver todo el feedback
- ✅ Super admins pueden actualizar feedback (status, notas)
- ❌ Usuarios NO pueden ver feedback de otros
- ❌ Usuarios NO pueden modificar feedback después de enviarlo

## 📱 Interfaz del modal:

### Pantalla 1: Selección de tipo
```
┌─────────────────────────────────────┐
│  Feedback                      [×]  │
├─────────────────────────────────────┤
│  ¿Qué te gustaría compartir?        │
│                                     │
│  ┌──────────┐    ┌──────────┐      │
│  │    🚨    │    │    💡    │      │
│  │ Problema │    │   Idea   │      │
│  │          │    │          │      │
│  └──────────┘    └──────────┘      │
└─────────────────────────────────────┘
```

### Pantalla 2: Formulario
```
┌─────────────────────────────────────┐
│  Feedback                      [×]  │
├─────────────────────────────────────┤
│  🚨 Reportar Problema               │
│  Describe el problema encontrado    │
├─────────────────────────────────────┤
│  Descripción *                      │
│  ┌─────────────────────────────┐   │
│  │ [Textarea para descripción] │   │
│  └─────────────────────────────┘   │
│                                     │
│  Calificación (opcional)            │
│  ☆ ☆ ☆ ☆ ☆                         │
│                                     │
│  [Atrás]  [Enviar Feedback]        │
└─────────────────────────────────────┘
```

## 🎯 Próximos pasos sugeridos:

1. **Dashboard de feedback para admins:**
   - Crear página de administración
   - Gráficos de estadísticas
   - Lista con filtros y búsqueda
   - Cambio de estado desde UI

2. **Notificaciones:**
   - Email al admin cuando llega nuevo feedback
   - Email al usuario cuando se resuelve su feedback
   - Integración con Slack/Discord

3. **Exportación:**
   - Exportar feedback a CSV/Excel
   - Reportes mensuales automáticos

---

**Commit:** 2c34441
**Fecha:** 2025-01-01
