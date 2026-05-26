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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {props.map((prop) => {
        const Icon = prop.icon;
        return (
          <div
            key={prop.title}
            className={`rounded-lg border border-slate-200 bg-gradient-to-br ${prop.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70`}
          >
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-md ${prop.iconBg}`}>
              <Icon className={`h-6 w-6 ${prop.iconColor}`} />
            </div>
            <h3 className="mb-2 text-base font-semibold text-text-primary">
              {prop.title}
            </h3>
            <p className="text-sm leading-relaxed text-text-muted">
              {prop.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
