'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../../lib/api';
import { DataTable } from '../../../components/admin/DataTable';

interface InventoryAlert {
  id: string;
  item_type: 'product' | 'variant';
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string | null;
  stock: number;
}

export default function AdminInventory() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; alerts: InventoryAlert[] }>('/api/admin/inventory/alerts', {
        params: { threshold },
      });
      if (res.success) setAlerts(res.alerts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAlerts();
  }, []);

  const columns = [
    { header: 'Item', cell: (item: InventoryAlert) => (
      <div>
        <p className="font-medium text-white">{item.name}</p>
        <p className="text-xs text-slate-500 uppercase">{item.item_type}</p>
      </div>
    ) },
    { header: 'SKU', cell: (item: InventoryAlert) => item.sku || '-' },
    { header: 'Stock', cell: (item: InventoryAlert) => (
      <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${item.stock === 0 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
        {item.stock}
      </span>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Alerts</h1>
          <p className="mt-1 text-sm text-slate-400">Products and variants at or below the selected threshold.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => setThreshold(parseInt(event.target.value || '0', 10))}
            className="w-24 rounded-xl border border-[#1e293b] bg-[#0a0a14] px-3 py-2 text-white outline-none focus:border-accent"
          />
          <button
            onClick={() => void fetchAlerts()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {!loading && alerts.length === 0 ? (
        <div className="rounded-xl border border-[#1e293b] bg-[#12121a] p-8 text-center text-slate-400">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          No low stock items found.
        </div>
      ) : (
        <DataTable data={alerts} columns={columns} keyExtractor={(item) => `${item.item_type}-${item.id}`} />
      )}
    </div>
  );
}
