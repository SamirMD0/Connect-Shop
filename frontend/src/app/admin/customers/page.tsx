'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { User, ApiResponse } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';

export default function AdminCustomers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get<ApiResponse<{ users: User[] }>>('/api/admin/users');
        if (res.success && res.data) {
          setUsers(res.data.users);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const columns = [
    { header: 'ID', cell: (u: User) => <span className="text-xs text-muted font-mono">{u.id}</span> },
    { header: 'Name', accessorKey: 'name' as keyof User },
    { header: 'Email', accessorKey: 'email' as keyof User },
    { header: 'Role', cell: (u: User) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-slate-800 text-slate-300'}`}>
        {u.role}
      </span>
    )},
  ];

  if (loading) return <div className="text-white">Loading customers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Customers</h1>
      </div>
      <DataTable data={users} columns={columns} keyExtractor={(u) => u.id} />
    </div>
  );
}
