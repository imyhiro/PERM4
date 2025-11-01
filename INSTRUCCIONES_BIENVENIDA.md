# 🎉 MODAL DE BIENVENIDA - INSTRUCCIONES

## ✅ Lo que ya está implementado:

- ✓ Componente WelcomeModal con diseño moderno y atractivo
- ✓ Sistema de checkbox "No volver a mostrar"
- ✓ Integración con Header.tsx
- ✓ TypeScript types completos
- ✓ Código committed al repositorio

## 🚀 Para activar el sistema:

### 1. Aplicar migración SQL en Supabase

Ve a **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
-- Agregar campo para controlar si el usuario ya vio el mensaje de bienvenida
ALTER TABLE users
ADD COLUMN dismissed_welcome boolean NOT NULL DEFAULT false;

-- Índice para consultas eficientes
CREATE INDEX idx_users_dismissed_welcome ON users(dismissed_welcome);

-- Comentario
COMMENT ON COLUMN users.dismissed_welcome IS 'Indica si el usuario ya vio y descartó el modal de bienvenida';
```

### 2. Verificar instalación

```sql
-- Verificar que la columna existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'dismissed_welcome';

-- Ver el valor para todos los usuarios
SELECT id, email, full_name, dismissed_welcome
FROM users;
```

## 🎨 Cómo funciona el modal:

### Para usuarios nuevos:

1. **Primera vez que inicia sesión:**
   - El modal aparece automáticamente al cargar la aplicación
   - No puede cerrarlo con click fuera del modal (debe usar el botón o la X)

2. **Contenido del modal:**
   - Saludo personalizado con el nombre del usuario
   - Mensaje de bienvenida a la Plataforma ERM 4.0
   - Información sobre su plan FREE:
     - 3 sitios (estudios) permitidos
     - 1 organización permitida
   - Información de contacto: info@girorm.mx
   - Checkbox: "No volver a mostrar este mensaje"

3. **Cerrar el modal:**
   - Click en botón "¡Empecemos!"
   - Click en X (esquina superior derecha)
   - Si marcó el checkbox, se guarda `dismissed_welcome = true` en la BD
   - Si NO marcó el checkbox, el modal volverá a aparecer en la próxima sesión

### Para usuarios existentes:

- El modal NO aparece porque `dismissed_welcome` ya está en `false` por defecto
- Si quieres que TODOS los usuarios vean el modal una vez más, ejecuta:
  ```sql
  UPDATE users SET dismissed_welcome = false;
  ```

## 📊 Campos involucrados:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| dismissed_welcome | boolean | `false` = mostrar modal, `true` = no mostrar |

## 🔍 Testing:

### Probar con un usuario específico:

```sql
-- Hacer que el modal aparezca nuevamente para un usuario
UPDATE users
SET dismissed_welcome = false
WHERE email = 'usuario@ejemplo.com';
```

### Probar que se actualiza correctamente:

1. Marca el checkbox en el modal
2. Cierra el modal
3. Ejecuta:
   ```sql
   SELECT email, dismissed_welcome
   FROM users
   WHERE email = 'tu-email@ejemplo.com';
   ```
4. Debe mostrar `dismissed_welcome = true`

## 🎯 Personalización opcional:

### Cambiar el mensaje según el plan:

Si en el futuro quieres personalizar el mensaje según el plan del usuario, edita el archivo `src/components/WelcomeModal.tsx` alrededor de la línea 55-65:

```tsx
{/* Ejemplo de personalización por plan */}
{profile?.license_type === 'free' && (
  <p>Tu plan FREE te permite...</p>
)}
{profile?.license_type === 'pro' && (
  <p>Tu plan PRO te permite...</p>
)}
```

### Cambiar el diseño:

- **Colores**: Modifica las clases `bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700`
- **Tamaño**: Modifica `max-w-2xl` en el contenedor principal
- **Iconos**: Importa otros iconos de `lucide-react`

---

**Commit:** (próximo)
**Fecha:** 2025-01-01
