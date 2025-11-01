import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, AlertTriangle, Lightbulb, Send, Loader2, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackModalProps {
  onClose: () => void;
}

type FeedbackType = 'issue' | 'idea' | null;

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { profile } = useAuth();
  const [selectedType, setSelectedType] = useState<FeedbackType>(null);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !selectedType) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('feedback').insert({
        user_id: profile?.id,
        user_email: profile?.email,
        user_name: profile?.full_name,
        feedback_type: selectedType,
        description: description.trim(),
        rating: rating || null,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
      });

      if (error) throw error;

      setSubmitted(true);

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error enviando feedback:', error);
      alert('Error al enviar el feedback. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
    setDescription('');
    setRating(0);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Gracias por tu feedback!</h3>
          <p className="text-gray-600">Tu opinión nos ayuda a mejorar la plataforma.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay para cerrar al hacer click fuera */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown del feedback */}
      <div className="absolute right-0 mt-2 w-[500px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
        {!selectedType ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">¿Qué te gustaría compartir?</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opciones horizontales */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Issue Card - Izquierda */}
                <button
                  onClick={() => setSelectedType('issue')}
                  className="group relative p-4 border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50/50 transition-all text-center"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-red-200 transition">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Problema</h4>
                  <p className="text-xs text-gray-600">
                    Reportar un error
                  </p>
                </button>

                {/* Idea Card - Derecha */}
                <button
                  onClick={() => setSelectedType('idea')}
                  className="group relative p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-all text-center"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-orange-200 transition">
                    <Lightbulb className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Idea</h4>
                  <p className="text-xs text-gray-600">
                    Sugerir mejora
                  </p>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header con tipo seleccionado */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedType === 'issue'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {selectedType === 'issue' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Lightbulb className="w-4 h-4" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedType === 'issue' ? 'Reportar Problema' : 'Compartir Idea'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
                disabled={submitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-4 max-h-[500px] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder={
                    selectedType === 'issue'
                      ? 'Describe el problema que experimentaste...'
                      : 'Comparte tu idea o sugerencia...'
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={submitting}
                />
              </div>

              {/* Rating (opcional) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Calificación (opcional)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                      disabled={submitting}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:cursor-not-allowed"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={submitting || !description.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
