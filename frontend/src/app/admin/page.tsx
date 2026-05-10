'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DollarSign, ShoppingCart, Users, Package, Grid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { AnalyticsSummary } from '../../lib/types';
import { AdminStatCard } from '../../components/admin/AdminStatCard';

export default function AdminOverview() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get<{ success: boolean; analytics: AnalyticsSummary }>('/api/admin/analytics/monthly-revenue');
        if (res.success && res.analytics) {
          setData(res.analytics);
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#1e293b] rounded-xl w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-32 bg-[#12121a] rounded-xl border border-[#1e293b]"></div>
          ))}
        </div>
        <div className="h-96 bg-[#12121a] rounded-xl border border-[#1e293b] mt-8"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-12 text-center mt-8">
        <p className="text-slate-400">Failed to load analytics data. Please try again later.</p>
      </div>
    );
  }

  // Format chart data
  const chartData = data.monthlyRevenue.map(item => ({
    name: item.month,
    revenue: parseFloat(item.revenue),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-400 mt-2">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <AdminStatCard 
          title="Total Revenue" 
          value={`$${parseFloat(data.totalRevenue).toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />} 
        />
        <AdminStatCard 
          title="Total Orders" 
          value={data.totalOrders.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5" />} 
        />
        <AdminStatCard 
          title="Total Customers" 
          value={data.totalCustomers.toLocaleString()}
          icon={<Users className="w-5 h-5" />} 
        />
        <AdminStatCard 
          title="Categories" 
          value={data.totalCategories.toLocaleString()}
          icon={<Grid className="w-5 h-5" />} 
        />
        <AdminStatCard 
          title="Products" 
          value={data.totalProducts.toLocaleString()}
          icon={<Package className="w-5 h-5" />} 
        />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Monthly Revenue</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `$${val}`} 
              />
              <Tooltip 
                cursor={{ fill: '#1e293b' }} 
                contentStyle={{ 
                  backgroundColor: '#12121a', 
                  borderColor: '#1e293b', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#f1f5f9' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Categories */}
        <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Categories</h3>
            <Link href="/admin/categories" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View All
            </Link>
          </div>
          {data.recentCategories.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No categories added yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-[#0a0a14] p-4 rounded-xl border border-[#1e293b] hover:border-[#2e3e5b] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {cat.image_url ? (
                        <Image src={cat.image_url} alt={cat.name} width={24} height={24} className="object-contain" />
                      ) : (
                        <Grid className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{cat.name}</p>
                      <p className="text-xs text-slate-500">/{cat.slug}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#1e293b] text-slate-400 px-3 py-1.5 rounded-lg">
                    {cat.product_count || 0} products
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Products */}
        <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Products</h3>
            <Link href="/admin/products" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View All
            </Link>
          </div>
          {data.recentProducts.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No products added yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentProducts.map(prod => (
                <div key={prod.id} className="flex justify-between items-center bg-[#0a0a14] p-4 rounded-xl border border-[#1e293b] hover:border-[#2e3e5b] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {prod.image_url ? (
                        <Image src={prod.image_url} alt={prod.name} width={40} height={40} className="object-cover rounded" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium line-clamp-1">{prod.name}</p>
                      <p className="text-xs text-accent">${parseFloat(prod.price).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-lg ${
                    prod.stock > 0 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
