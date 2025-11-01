import { X, Zap, Crown, Check, Mail } from 'lucide-react';

interface UpgradePlanModalProps {
  onClose: () => void;
  limitType: 'organizations' | 'sites';
  currentLimit: number;
}

export function UpgradePlanModal({ onClose, limitType, currentLimit }: UpgradePlanModalProps) {
  const limitText = limitType === 'organizations'
    ? `${currentLimit} organización${currentLimit > 1 ? 'es' : ''}`
    : `${currentLimit} sitios`;

  const plans = [
    {
      name: 'PRO',
      icon: Zap,
      price: '$450 MXN/mes',
      annualPrice: '$4,320 MXN/año',
      discount: '20% descuento anual',
      color: 'from-blue-500 to-indigo-600',
      borderColor: 'border-blue-500',
      features: [
        'Organizaciones ilimitadas',
        'Hasta 10 sitios',
        'Análisis con IA',
        'Reportes avanzados',
        'Soporte prioritario',
      ],
    },
    {
      name: 'PROMAX',
      icon: Crown,
      price: '$1,500 MXN/mes',
      annualPrice: '$14,400 MXN/año',
      discount: '20% descuento anual',
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500',
      popular: true,
      features: [
        'Todo ilimitado',
        'Organizaciones sin límite',
        'Sitios sin límite',
        'IA avanzada',
        'Soporte VIP 24/7',
        'Consultoría personalizada',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-50 via-slate-100 to-blue-50 px-8 py-8 border-b-2 border-slate-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ¡Has alcanzado el límite de tu plan FREE!
            </h1>
            <p className="text-slate-600">
              Tu plan actual permite <strong>{limitText}</strong>. Actualiza para continuar creciendo.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative bg-white border-2 ${plan.borderColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all ${
                    plan.popular ? 'ring-4 ring-amber-200 ring-offset-2' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                      MÁS POPULAR
                    </div>
                  )}

                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {plan.annualPrice} <span className="text-green-600 font-semibold">({plan.discount})</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <a
                    href="mailto:info@girorm.mx?subject=Upgrade a plan PRO/PROMAX"
                    className={`block w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl text-center`}
                  >
                    Actualizar a {plan.name}
                  </a>
                </div>
              );
            })}
          </div>

          {/* Contact info */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-700 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-gray-600" />
              ¿Tienes preguntas?{' '}
              <a
                href="mailto:info@girorm.mx"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                info@girorm.mx
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
