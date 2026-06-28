'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { api } from '../../../lib/api';

interface SearchResults {
  products: Array<{
    id: string;
    name: string;
    sku?: string | null;
    slug?: string | null;
  }>;
  orders: Array<{
    id: string;
    customer_email?: string | null;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

const emptyResults: SearchResults = { products: [], orders: [], users: [], categories: [] };

export default function AdminSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);

  async function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; results: SearchResults }>('/api/admin/search', {
        params: { q: query },
      });
      if (res.success) setResults(res.results || emptyResults);
    } finally {
      setLoading(false);
    }
  }

  const sectionClasses = 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1B48]">Dashboard Search</h1>
        <p className="mt-1 text-sm text-slate-500">Search products, orders, customers, and categories from one place.</p>
      </div>

      <form onSubmit={submitSearch} className="relative max-w-2xl">
        <label htmlFor="admin-search" className="sr-only">Search admin records</label>
        <input
          id="admin-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search admin records..."
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-4 pr-12 text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-slate-400 transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          disabled={loading}
          aria-label="Search admin records"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={sectionClasses}>
          <h2 className="mb-3 font-semibold text-[#0B1B48]">Products</h2>
          <div className="space-y-3">
            {results.products.map(product => (
              <Link key={product.id} href={`/admin/products`} className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:border-accent/60">
                <span className="font-medium text-[#0B1B48]">{product.name}</span>
                <span className="ml-2 text-slate-500">{product.sku || product.slug}</span>
              </Link>
            ))}
            {results.products.length === 0 && <p className="text-sm text-slate-500">No products found.</p>}
          </div>
        </section>

        <section className={sectionClasses}>
          <h2 className="mb-3 font-semibold text-[#0B1B48]">Orders</h2>
          <div className="space-y-3">
            {results.orders.map(order => (
              <Link key={order.id} href="/admin/orders" className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:border-accent/60">
                <span className="font-mono text-[#0B1B48]">{String(order.id).slice(0, 8)}</span>
                <span className="ml-2 text-slate-500">{order.customer_email}</span>
              </Link>
            ))}
            {results.orders.length === 0 && <p className="text-sm text-slate-500">No orders found.</p>}
          </div>
        </section>

        <section className={sectionClasses}>
          <h2 className="mb-3 font-semibold text-[#0B1B48]">Customers</h2>
          <div className="space-y-3">
            {results.users.map(user => (
              <Link key={user.id} href="/admin/customers" className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:border-accent/60">
                <span className="font-medium text-[#0B1B48]">{user.name}</span>
                <span className="ml-2 text-slate-500">{user.email}</span>
              </Link>
            ))}
            {results.users.length === 0 && <p className="text-sm text-slate-500">No customers found.</p>}
          </div>
        </section>

        <section className={sectionClasses}>
          <h2 className="mb-3 font-semibold text-[#0B1B48]">Categories</h2>
          <div className="space-y-3">
            {results.categories.map(category => (
              <Link key={category.id} href="/admin/categories" className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:border-accent/60">
                <span className="font-medium text-[#0B1B48]">{category.name}</span>
                <span className="ml-2 text-slate-500">{category.slug}</span>
              </Link>
            ))}
            {results.categories.length === 0 && <p className="text-sm text-slate-500">No categories found.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
