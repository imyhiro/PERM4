import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Sparkles, Mail, CheckCircle2 } from 'lucide-react';

interface WelcomeModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export function WelcomeModal({ userId, userName, onClose }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    setClosing(true);

    if (dontShowAgain) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ dismissed_welcome: true })
          .eq('id', userId);

        if (error) {
          console.error('Error updating welcome status:', error);
        }
      } catch (error) {
        console.error('Error updating welcome status:', error);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-10 text-white">
          <button
            onClick={handleClose}
            disabled={closing}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">¡Bienvenido, {userName}!</h1>
              <p className="text-blue-100 text-sm mt-1">Plataforma ERM 4.0</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-8 py-6 space-y-6">
          {/* Mensaje principal */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              Estás a punto de vivir la mejor experiencia en Análisis de Riesgos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              La Plataforma ERM 4.0 está diseñada para hacer que tu trabajo sea más eficiente,
              preciso y profesional. Con herramientas intuitivas y metodología probada, estarás
              generando análisis de riesgos de clase mundial en minutos.
            </p>
          </div>

          {/* Info del plan */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Tu Plan FREE
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Tu plan actual te permite crear <strong>hasta 3 sitios (estudios)</strong> dentro
              de <strong>1 organización</strong>. Es perfecto para comenzar a explorar todo el
              potencial de la plataforma.
            </p>
            <p className="text-gray-600 text-xs mt-2">
              ¿Necesitas más capacidad? Actualiza a PRO o PROMAX cuando estés listo.
            </p>
          </div>

          {/* Contacto */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-600" />
              ¿Tienes preguntas o necesitas ayuda?
            </h3>
            <p className="text-gray-700 text-sm">
              Escríbenos a{' '}
              <a
                href="mailto:info@girorm.mx"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                info@girorm.mx
              </a>
            </p>
          </div>

          {/* Checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              No volver a mostrar este mensaje
            </label>
          </div>

          {/* Botón */}
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            ¡Empecemos!
          </button>
        </div>
      </div>
    </div>
  );
}
