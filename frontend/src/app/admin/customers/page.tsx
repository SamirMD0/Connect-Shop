'use client';

import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { User } from '../../../lib/types';
import { hasAdminPermission } from '../../../lib/adminPermissions';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';
import { Button } from '../../../components/ui/Button';

const roles = ['customer', 'support', 'manager', 'admin', 'super_admin'];
const FRESH_MFA_REQUIRED_CODE = 'FRESH_MFA_REQUIRED';

interface PendingRoleChange {
  userId: string;
  role: string;
  label: string;
}

interface CustomerAddress {
  id: string;
  recipient_name: string;
  address_line1: string;
  city: string;
  country: string;
}

interface CustomerOrder {
  id: string;
  status: string;
  total: string | number;
}

interface CustomerDetail {
  success: boolean;
  user: User;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  totals: {
    order_count: number;
    total_spent: string | number;
  };
}

export default function AdminCustomers() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<CustomerDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const canManageRoles = hasAdminPermission(currentUser?.role, 'admin_roles');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get<{ success: boolean; users?: User[]; data?: { users: User[] } }>('/api/admin/users');
        if (res.success) {
          setUsers(res.data?.users || res.users || []);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  function applyUpdatedUser(updatedUser: User) {
    setUsers(current => current.map(user => user.id === updatedUser.id ? { ...user, role: updatedUser.role } : user));
    if (selectedDetail?.user?.id === updatedUser.id) {
      setSelectedDetail({ ...selectedDetail, user: { ...selectedDetail.user, role: updatedUser.role } });
    }
  }

  async function commitRoleChange(userId: string, role: string) {
    const res = await api.put<{ success: boolean; user: User }>(`/api/admin/users/${userId}/role`, { role });
    if (res.success) {
      applyUpdatedUser(res.user);
    }
  }

  async function updateRole(targetUser: User, role: string) {
    try {
      await commitRoleChange(targetUser.id, role);
      addToast('User role updated.', 'success');
    } catch (error) {
      if (error instanceof ApiError && error.code === FRESH_MFA_REQUIRED_CODE) {
        setPendingRoleChange({
          userId: targetUser.id,
          role,
          label: targetUser.name || targetUser.email,
        });
        setMfaCode('');
        setMfaError('');
        return;
      }

      addToast(error instanceof ApiError || error instanceof Error ? error.message : 'Failed to update user role.', 'error');
    }
  }

  function closeFreshMfaModal() {
    if (mfaLoading) return;
    setPendingRoleChange(null);
    setMfaCode('');
    setMfaError('');
  }

  async function submitFreshMfa(event: React.FormEvent) {
    event.preventDefault();

    if (!pendingRoleChange) return;
    if (!/^\d{6}$/.test(mfaCode)) {
      setMfaError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    const roleChangeToRetry = pendingRoleChange;
    setMfaLoading(true);
    setMfaError('');

    try {
      await api.post('/api/auth/mfa/verify', { code: mfaCode });
      setMfaCode('');
      await commitRoleChange(roleChangeToRetry.userId, roleChangeToRetry.role);
      setPendingRoleChange(null);
      addToast('MFA verified. User role updated.', 'success');
    } catch (error) {
      setMfaCode('');
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Could not complete the role change.';
      setMfaError(message);
      addToast(message, 'error');
    } finally {
      setMfaLoading(false);
    }
  }

  async function openDetail(user: User) {
    const res = await api.get<CustomerDetail>(`/api/admin/users/${user.id}`);
    if (res.success) {
      setSelectedDetail(res);
      setDetailOpen(true);
    }
  }

  const columns = [
    { header: 'ID', cell: (u: User) => <span className="font-mono text-xs text-slate-500">{u.id.slice(0, 8)}</span> },
    { header: 'Name', cell: (u: User) => <span className="font-semibold text-[#0B1B48]">{u.name}</span> },
    { header: 'Email', cell: (u: User) => <span className="text-slate-600">{u.email}</span> },
    { header: 'Role', cell: (u: User) => {
      const roleClasses = ['admin', 'super_admin'].includes(u.role)
        ? 'border-accent/20 bg-accent/10 text-accent'
        : 'border-slate-200 bg-slate-50 text-slate-600';

      if (!canManageRoles) {
        return (
          <span className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${roleClasses}`}>
            {u.role}
          </span>
        );
      }

      return (
        <select
          value={u.role}
          onChange={(event) => void updateRole(u, event.target.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors focus:border-accent ${roleClasses}`}
          aria-label={`Change role for ${u.name || u.email}`}
        >
          {roles.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
      );
    }},
    { header: 'Actions', cell: (u: User) => (
      <button onClick={() => void openDetail(u)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-accent/10 hover:text-accent">
        <Eye className="h-4 w-4" />
        View
      </button>
    )},
  ];

  if (loading) return <DataTable data={[]} columns={columns} keyExtractor={(u) => u.id} loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Review customer profiles, roles, addresses, and recent orders.</p>
        </div>
      </div>
      <DataTable data={users} columns={columns} keyExtractor={(u) => u.id} emptyMessage="No customers found" />

      <Modal isOpen={Boolean(pendingRoleChange)} onClose={closeFreshMfaModal} title="Verify MFA to continue">
        <form onSubmit={submitFreshMfa} className="space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold text-amber-950">Sensitive admin action</p>
            <p className="mt-1 leading-6">
              This action changes admin privileges. Enter your 6-digit authenticator code to continue.
            </p>
            {pendingRoleChange && (
              <p className="mt-2 text-xs">
                Pending change: <strong>{pendingRoleChange.label}</strong> to <strong>{pendingRoleChange.role}</strong>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="fresh-mfa-code" className="mb-2 block text-sm font-medium text-[#0B1B48]">
              Authenticator code
            </label>
            <input
              id="fresh-mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaCode}
              onChange={(event) => {
                setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setMfaError('');
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-[#0B1B48] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              placeholder="000000"
            />
            <p className="mt-2 text-xs text-slate-500">
              Use the current code from your authenticator app. The code is never stored.
            </p>
          </div>

          {mfaError && (
            <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {mfaError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeFreshMfaModal} disabled={mfaLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={mfaLoading} disabled={mfaCode.length !== 6}>
              Verify and continue
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Customer Detail">
        {selectedDetail && (
          <div className="space-y-5 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-[#0B1B48]">{selectedDetail.user.name}</p>
              <p className="text-slate-600">{selectedDetail.user.email}</p>
              <div className="mt-3 grid gap-2 rounded-lg bg-white p-3 text-xs text-slate-500 sm:grid-cols-2">
                <span>Role: <strong className="text-[#0B1B48]">{selectedDetail.user.role}</strong></span>
                <span>Orders: <strong className="text-[#0B1B48]">{selectedDetail.totals.order_count}</strong></span>
                <span className="sm:col-span-2">Total spent: <strong className="text-[#0B1B48]">${selectedDetail.totals.total_spent}</strong></span>
              </div>
            </div>

            <section>
              <h2 className="mb-2 font-semibold text-[#0B1B48]">Addresses</h2>
              <div className="space-y-2">
                {selectedDetail.addresses.map((address) => (
                  <div key={address.id} className="rounded-lg border border-slate-200 bg-white p-3 text-slate-600">
                    {address.recipient_name}, {address.address_line1}, {address.city}, {address.country}
                  </div>
                ))}
                {selectedDetail.addresses.length === 0 && <p className="text-slate-500">No saved addresses.</p>}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-[#0B1B48]">Recent Orders</h2>
              <div className="space-y-2">
                {selectedDetail.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-600">
                    <span className="font-mono">{String(order.id).slice(0, 8)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-600">{order.status}</span>
                    <span className="font-semibold text-[#0B1B48]">${order.total}</span>
                  </div>
                ))}
                {selectedDetail.orders.length === 0 && <p className="text-slate-500">No orders yet.</p>}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
