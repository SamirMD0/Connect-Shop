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
    <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-6 transition-all duration-200 hover:border-[#2e3e5b]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-white">{value}</div>
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}
