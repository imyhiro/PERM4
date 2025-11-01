# 📸 SISTEMA DE AVATARES - INSTRUCCIONES DE INSTALACIÓN

## ✅ Lo que ya está hecho:
- ✓ Componente AvatarUpload creado
- ✓ Integración en Header con badges estilizados
- ✓ Iconos para roles y planes
- ✓ Código committed al repositorio

## 🚀 Lo que necesitas hacer AHORA:

### 1. Aplicar migraciones SQL en Supabase

Ve a **Supabase Dashboard → SQL Editor** y ejecuta estos 2 scripts en orden:

#### Script 1: Agregar campo avatar_url
```sql
-- Agregar campo avatar_url a la tabla users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comentario para documentar el campo
COMMENT ON COLUMN users.avatar_url IS 'URL de la foto de perfil del usuario (puede ser de Supabase Storage o URL externa)';
```

#### Script 2: Configurar Storage para avatares
```sql
-- Crear bucket para avatares de usuarios
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Cualquier usuario autenticado puede ver avatares (son públicos)
CREATE POLICY "Los avatares son públicos para ver" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Política: Los usuarios pueden subir su propio avatar
CREATE POLICY "Los usuarios pueden subir su propio avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: Los usuarios pueden actualizar su propio avatar
CREATE POLICY "Los usuarios pueden actualizar su propio avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: Los usuarios pueden eliminar su propio avatar
CREATE POLICY "Los usuarios pueden eliminar su propio avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 2. Verificar que todo funcionó

Ejecuta esta query para verificar:
```sql
-- Verificar que el campo existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'avatar_url';

-- Verificar que el bucket existe
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Verificar políticas
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
```

## 🎨 Funcionalidades disponibles:

Una vez aplicadas las migraciones, los usuarios podrán:

1. **Ver badges estilizados** en el header:
   - 🛡️ Shield para Super Admin
   - ⚙️ Settings para Administrador
   - 💼 Briefcase para Consultor
   - 👁️ Eye para Lector
   - ✨ Sparkles para plan FREE
   - ⚡ Zap para plan PRO
   - 👑 Crown para plan PROMAX

2. **Subir foto de perfil**:
   - Hacer clic en su avatar o nombre
   - Seleccionar "Cambiar foto de perfil"
   - Elegir una imagen (JPG, PNG, etc. - máx 2MB)
   - Ver preview en tiempo real
   - Confirmar o cancelar

3. **Eliminar foto de perfil**:
   - Abrir el modal de avatar
   - Hacer clic en "Eliminar foto"
   - Volver al avatar por defecto (icono genérico)

## 📁 Ubicación de archivos:

**Migraciones SQL:**
- `supabase/migrations/20250101130000_add_avatar_to_users.sql`
- `supabase/migrations/20250101130001_setup_avatars_storage.sql`

**Componentes React:**
- `src/components/AvatarUpload.tsx`
- `src/components/Header.tsx` (modificado)

**Tipos:**
- `src/lib/database.types.ts` (actualizado)

## 🔒 Seguridad:

Las políticas RLS garantizan que:
- ✅ Todos pueden VER avatares (son públicos)
- ✅ Solo puedes SUBIR tu propio avatar
- ✅ Solo puedes ACTUALIZAR tu propio avatar
- ✅ Solo puedes ELIMINAR tu propio avatar
- ❌ No puedes modificar avatares de otros usuarios

## 🎯 ¿Todo listo?

Una vez que ejecutes los 2 scripts SQL:
1. Recarga la aplicación
2. Haz clic en tu nombre/avatar en la esquina superior derecha
3. Verás la opción "Cambiar foto de perfil"
4. ¡Sube tu primera foto!

---

**Commit:** 23381f6
**Fecha:** 2025-01-01
