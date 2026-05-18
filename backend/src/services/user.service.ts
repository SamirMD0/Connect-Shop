import { query } from '../config/db';
import { AppError, NotFoundError } from '../utils/errors';
import { destroyAllUserSessions, User } from './auth.service';

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  zip_code: string | null;
  country: string;
  notes: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  isDefault?: boolean;
}

export async function updateProfile(
  userId: string,
  input: { name?: string; phone?: string | null }
): Promise<User> {
  const name = input.name?.trim();
  const phone = input.phone?.trim() || null;

  if (name !== undefined && (!name || name.length > 255)) {
    throw new AppError('Name must be between 1 and 255 characters', 400);
  }

  if (phone && phone.length > 30) {
    throw new AppError('Phone must be under 30 characters', 400);
  }

  const rows = await query<User>(
    `UPDATE users
     SET name = COALESCE($2, name),
         phone = $3
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [userId, name ?? null, phone]
  );

  if (!rows[0]) throw new NotFoundError('User');
  return rows[0];
}

export async function listAddresses(userId: string): Promise<UserAddress[]> {
  return query<UserAddress>(
    `SELECT *
     FROM user_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
}

async function clearDefaultAddress(userId: string): Promise<void> {
  await query(`UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]);
}

export async function createAddress(userId: string, input: AddressInput): Promise<UserAddress> {
  if (input.isDefault) await clearDefaultAddress(userId);

  const rows = await query<UserAddress>(
    `INSERT INTO user_addresses (
       user_id, label, recipient_name, phone, address_line1, address_line2,
       city, state, zip_code, country, notes, is_default
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'Lebanon'), $11, $12)
     RETURNING *`,
    [
      userId,
      input.label?.trim() || 'Home',
      input.recipientName.trim(),
      input.phone.trim(),
      input.addressLine1.trim(),
      input.addressLine2?.trim() || null,
      input.city.trim(),
      input.state?.trim() || null,
      input.zipCode?.trim() || null,
      input.country?.trim() || null,
      input.notes?.trim() || null,
      Boolean(input.isDefault),
    ]
  );

  return rows[0];
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput): Promise<UserAddress> {
  if (input.isDefault) await clearDefaultAddress(userId);

  const rows = await query<UserAddress>(
    `UPDATE user_addresses
     SET label = $3,
         recipient_name = $4,
         phone = $5,
         address_line1 = $6,
         address_line2 = $7,
         city = $8,
         state = $9,
         zip_code = $10,
         country = COALESCE($11, 'Lebanon'),
         notes = $12,
         is_default = $13
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [
      addressId,
      userId,
      input.label?.trim() || 'Home',
      input.recipientName.trim(),
      input.phone.trim(),
      input.addressLine1.trim(),
      input.addressLine2?.trim() || null,
      input.city.trim(),
      input.state?.trim() || null,
      input.zipCode?.trim() || null,
      input.country?.trim() || null,
      input.notes?.trim() || null,
      Boolean(input.isDefault),
    ]
  );

  if (!rows[0]) throw new NotFoundError('Address');
  return rows[0];
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const rows = await query<{ id: string }>(
    `DELETE FROM user_addresses
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [addressId, userId]
  );

  if (!rows[0]) throw new NotFoundError('Address');
}

export async function exportAccount(userId: string): Promise<Record<string, unknown>> {
  const [users, addresses, orders, cartItems, wishlist, reviews] = await Promise.all([
    query(`SELECT id, email, name, phone, avatar_url, role, email_verified_at, created_at, updated_at FROM users WHERE id = $1`, [userId]),
    listAddresses(userId),
    query(`SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    query(`SELECT * FROM cart_items WHERE user_id = $1`, [userId]),
    query(`SELECT * FROM wishlists WHERE user_id = $1`, [userId]),
    query(`SELECT * FROM reviews WHERE user_id = $1`, [userId]),
  ]);

  return {
    user: users[0] || null,
    addresses,
    orders,
    cartItems,
    wishlist,
    reviews,
  };
}

export async function deleteAccount(userId: string): Promise<void> {
  await destroyAllUserSessions(userId);
  await query(`DELETE FROM user_addresses WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM wishlists WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM reviews WHERE user_id = $1`, [userId]);
  await query(
    `UPDATE users
     SET email = CONCAT('deleted+', id::text, '@deleted.elecshop.local'),
         google_id = NULL,
         name = 'Deleted user',
         avatar_url = NULL,
         phone = NULL,
         password_hash = NULL,
         email_verified_at = NULL,
         mfa_enabled = FALSE,
         mfa_secret = NULL,
         mfa_confirmed_at = NULL,
         deleted_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}
