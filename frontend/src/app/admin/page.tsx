'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, Users, Package, Grid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { AnalyticsSummary, ApiResponse } from '../../lib/types';
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
        <div className="h-8 bg-slate-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl mt-8"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-surface border border-slate-800 rounded-xl p-12 text-center mt-8">
        <p className="text-muted">Failed to load analytics data. Please try again later.</p>
      </div>
    );
  }

  // Format chart data
  const chartData = data.monthlyRevenue.map(item => ({
    name: item.month, // e.g. "2023-10"
    revenue: parseFloat(item.revenue),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Dashboard Overview</h1>
        <p className="text-muted mt-2">Welcome back to the admin panel. Here's what's happening today.</p>
      </div>

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
          title="Total Categories" 
          value={data.totalCategories.toLocaleString()}
          icon={<Grid className="w-5 h-5" />} 
        />
        <AdminStatCard 
          title="Total Products" 
          value={data.totalProducts.toLocaleString()}
          icon={<Package className="w-5 h-5" />} 
        />
      </div>

      <div className="bg-surface border border-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-primary mb-6">Monthly Revenue</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{ fill: '#1e293b' }} 
                contentStyle={{ backgroundColor: '#12121a', borderColor: '#1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#f1f5f9' }}
                formatter={(value: any) => [`$${value}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Categories */}
        <div className="bg-surface border border-slate-800 rounded-xl p-6 shadow-lg overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-primary">Recent Categories</h3>
            <Link href="/admin/categories" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View All
            </Link>
          </div>
          {data.recentCategories.length === 0 ? (
            <p className="text-muted text-center py-4">No categories added yet.</p>
          ) : (
            <div className="space-y-4">
              {data.recentCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <Grid className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    <div>
                      <p className="text-primary font-medium">{cat.name}</p>
                      <p className="text-xs text-muted">/{cat.slug}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-800 text-muted px-2 py-1 rounded">
                    {cat.product_count || 0} products
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Products */}
        <div className="bg-surface border border-slate-800 rounded-xl p-6 shadow-lg overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-primary">Recent Products</h3>
            <Link href="/admin/products" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View All
            </Link>
          </div>
          {data.recentProducts.length === 0 ? (
            <p className="text-muted text-center py-4">No products added yet.</p>
          ) : (
            <div className="space-y-4">
              {data.recentProducts.map(prod => (
                <div key={prod.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover rounded" />
                      ) : (
                        <Package className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    <div>
                      <p className="text-primary font-medium line-clamp-1">{prod.name}</p>
                      <p className="text-xs text-muted">${parseFloat(prod.price).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${prod.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
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
