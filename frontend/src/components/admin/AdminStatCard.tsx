import React from 'react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function AdminStatCard({ title, value, icon, trend }: AdminStatCardProps) {
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-[#0B1B48]">{value}</div>
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}
