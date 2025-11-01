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
