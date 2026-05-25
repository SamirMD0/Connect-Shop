'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { UserAddress } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  phone: z.string().trim().max(30, 'Phone must be under 30 characters').optional().or(z.literal('')),
});

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(80).optional().or(z.literal('')),
  recipientName: z.string().trim().min(1, 'Recipient name is required').max(200),
  phone: z.string().trim().min(7, 'Phone must be at least 7 characters').max(30),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(300),
  addressLine2: z.string().trim().max(300).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required').max(120),
  state: z.string().trim().max(120).optional().or(z.literal('')),
  zipCode: z.string().trim().max(30).optional().or(z.literal('')),
  country: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  isDefault: z.boolean(),
});

interface AddressForm {
  id?: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string;
  isDefault: boolean;
}

const emptyAddress: AddressForm = {
  label: 'Home',
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Lebanon',
  notes: '',
  isDefault: false,
};

function mapAddress(address: UserAddress): AddressForm {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipient_name,
    phone: address.phone,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2 || '',
    city: address.city,
    state: address.state || '',
    zipCode: address.zip_code || '',
    country: address.country,
    notes: address.notes || '',
    isDefault: address.is_default,
  };
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ success: boolean; addresses: UserAddress[] }>('/api/users/me/addresses')
      .then((res) => setAddresses(res.addresses))
      .catch(() => setAddresses([]));
  }, [user]);

  if (loading || !user) {
    return (
      <Container className="py-12 min-h-[70vh]">
        <div className="w-10 h-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </Container>
    );
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const validation = profileSchema.safeParse({ name, phone });
      if (!validation.success) {
        setError(validation.error.issues[0].message);
        return;
      }

      await api.patch('/api/users/me', validation.data);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Profile update failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const validation = addressSchema.safeParse(addressForm);
      if (!validation.success) {
        setError(validation.error.issues[0].message);
        return;
      }

      if (addressForm.id) {
        await api.put(`/api/users/me/addresses/${addressForm.id}`, validation.data);
      } else {
        await api.post('/api/users/me/addresses', validation.data);
      }
      const res = await api.get<{ success: boolean; addresses: UserAddress[] }>('/api/users/me/addresses');
      setAddresses(res.addresses);
      setAddressForm(emptyAddress);
      setMessage('Address saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Address save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: string) {
    await api.delete(`/api/users/me/addresses/${id}`);
    setAddresses(addresses.filter((address) => address.id !== id));
  }

  async function exportData() {
    const res = await api.get<{ success: boolean; data: unknown }>('/api/users/me/export');
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'elecshop-account-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account? This signs you out and removes saved profile data.')) return;
    await api.delete('/api/users/me');
    window.location.href = '/';
  }

  return (
    <Container className="py-10 min-h-[70vh]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Account</h1>
        <p className="text-text-muted">{user.email}</p>
        {user.emailVerified === false && <p className="text-sm text-amber-600 mt-2">Email verification is pending.</p>}
      </div>

      {(message || error) && (
        <p className={`mb-5 text-sm ${error ? 'text-danger' : 'text-accent'}`}>{error || message}</p>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <form onSubmit={saveProfile} className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Profile</h2>
          <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <Button type="submit" loading={saving}>Save profile</Button>
        </form>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Data controls</h2>
          <Button type="button" variant="outline" onClick={exportData}>Export account data</Button>
          <Button type="button" variant="danger" onClick={deleteAccount}>Delete account</Button>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Addresses</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={saveAddress} className="space-y-3">
            <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="Label" />
            <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.recipientName} onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })} placeholder="Recipient name" required />
            <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} placeholder="Phone" required />
            <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.addressLine1} onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })} placeholder="Address line 1" required />
            <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.addressLine2} onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })} placeholder="Address line 2" />
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="City" required />
              <input className="w-full px-4 py-3 rounded-xl border border-slate-200" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="Region" />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} />
              Default address
            </label>
            <div className="flex gap-3">
              <Button type="submit" loading={saving}>{addressForm.id ? 'Update address' : 'Add address'}</Button>
              {addressForm.id && <Button type="button" variant="ghost" onClick={() => setAddressForm(emptyAddress)}>Cancel</Button>}
            </div>
          </form>

          <div className="space-y-3">
            {addresses.map((address) => (
              <div key={address.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text-primary">{address.label} {address.is_default && <span className="text-xs text-accent">Default</span>}</p>
                    <p className="text-sm text-text-muted">{address.recipient_name}, {address.phone}</p>
                    <p className="text-sm text-text-muted">{address.address_line1}, {address.city}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setAddressForm(mapAddress(address))}>Edit</Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => removeAddress(address.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {addresses.length === 0 && <p className="text-text-muted">No saved addresses yet.</p>}
          </div>
        </div>
      </section>
    </Container>
  );
}
