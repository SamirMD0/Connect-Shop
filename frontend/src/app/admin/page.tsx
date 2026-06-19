'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DollarSign, ShoppingCart, Users, Package, Grid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { AnalyticsSummary } from '../../lib/types';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { PhantomSkeleton } from '../../components/ui/PhantomSkeleton';

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0B1B48]">Dashboard Overview</h1>
          <p className="mt-2 text-slate-500">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
        </div>

        <PhantomSkeleton loading={loading} className="block">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <AdminStatCard
              title="Total Revenue"
              value="$0"
              icon={<DollarSign className="w-5 h-5" />}
            />
            <AdminStatCard
              title="Total Orders"
              value="0"
              icon={<ShoppingCart className="w-5 h-5" />}
            />
            <AdminStatCard
              title="Total Customers"
              value="0"
              icon={<Users className="w-5 h-5" />}
            />
            <AdminStatCard
              title="Categories"
              value="0"
              icon={<Grid className="w-5 h-5" />}
            />
            <AdminStatCard
              title="Products"
              value="0"
              icon={<Package className="w-5 h-5" />}
            />
          </div>
        </PhantomSkeleton>

        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white mt-8"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm shadow-slate-200/80">
        <p className="text-slate-500">Failed to load analytics data. Please try again later.</p>
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
        <h1 className="text-3xl font-bold tracking-tight text-[#0B1B48]">Dashboard Overview</h1>
        <p className="mt-2 text-slate-500">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
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
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80">
        <h3 className="mb-6 text-lg font-semibold text-[#0B1B48]">Monthly Revenue</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                cursor={{ fill: '#eff6ff' }} 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(15,23,42,0.12)'
                }}
                itemStyle={{ color: '#0B1B48' }}
                labelStyle={{ color: '#64748b' }}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Categories */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-[#0B1B48]">Recent Categories</h3>
            <Link href="/admin/categories" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View All
            </Link>
          </div>
          {data.recentCategories.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No categories added yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                      {cat.image_url ? (
                        <Image src={cat.image_url} alt={cat.name} width={24} height={24} className="object-contain" />
                      ) : (
                        <Grid className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#0B1B48]">{cat.name}</p>
                      <p className="text-xs text-slate-500">/{cat.slug}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200">
                    {cat.product_count || 0} products
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Products */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-[#0B1B48]">Recent Products</h3>
            <Link href="/admin/products" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View All
            </Link>
          </div>
          {data.recentProducts.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No products added yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentProducts.map(prod => (
                <div key={prod.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                      {prod.image_url ? (
                        <Image src={prod.image_url} alt={prod.name} width={40} height={40} className="object-cover rounded" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="line-clamp-1 font-medium text-[#0B1B48]">{prod.name}</p>
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
