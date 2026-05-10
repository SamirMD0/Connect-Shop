import { Truck, Shield, Headphones } from 'lucide-react';

const props = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free delivery on all orders. No minimum purchase required.',
    gradient: 'from-blue-50 to-cyan-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'Secure Checkout',
    description: 'Your data is protected with industry-standard encryption.',
    gradient: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Get help anytime from our dedicated support team.',
    gradient: 'from-violet-50 to-purple-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
];

export function ValueProps() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {props.map((prop) => {
        const Icon = prop.icon;
        return (
          <div
            key={prop.title}
            className={`bg-gradient-to-br ${prop.gradient} rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
          >
            <div className={`w-12 h-12 ${prop.iconBg} rounded-xl flex items-center justify-center mb-4`}>
              <Icon className={`w-6 h-6 ${prop.iconColor}`} />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">
              {prop.title}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {prop.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
