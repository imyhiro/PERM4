import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Camera, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (newUrl: string) => void;
  onClose: () => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, onAvatarUpdated, onClose }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida (JPG, PNG, etc.)');
        return;
      }

      // Validar tamaño (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es muy grande. El tamaño máximo es 2MB.');
        return;
      }

      setUploading(true);

      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Eliminar avatar anterior si existe
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Subir nueva imagen a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Actualizar avatar_url en la tabla users
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Actualizar preview y notificar al padre
      setPreviewUrl(publicUrl);
      onAvatarUpdated(publicUrl);

      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error: any) {
      console.error('Error subiendo avatar:', error);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) {
      return;
    }

    try {
      setUploading(true);

      // Eliminar archivo de Storage si existe
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Actualizar avatar_url a null en la tabla users
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onAvatarUpdated('');

      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error: any) {
      console.error('Error eliminando avatar:', error);
      alert('Error al eliminar la imagen. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Cambiar foto de perfil
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-6">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-gray-400 shadow-lg">
              <Camera className="w-12 h-12 text-gray-500" />
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                {currentAvatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </>
            )}
          </button>

          {currentAvatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition font-medium"
            >
              <X className="w-5 h-5" />
              Eliminar foto
            </button>
          )}

          <button
            onClick={onClose}
            disabled={uploading}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:cursor-not-allowed transition font-medium"
          >
            Cancelar
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Formatos: JPG, PNG • Tamaño máximo: 2MB
        </p>
      </div>
    </div>
  );
}
