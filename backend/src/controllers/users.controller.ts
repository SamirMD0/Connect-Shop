import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';
import { getCrossSiteCookieSecurityOptions } from '../config/cookies';
import {
  createAddress,
  deleteAccount,
  deleteAddress,
  exportAccount,
  listAddresses,
  updateAddress,
  updateProfile,
  AddressInput,
} from '../services/user.service';

function parseAddressInput(body: any): AddressInput {
  const input: AddressInput = {
    label: body.label,
    recipientName: body.recipientName,
    phone: body.phone,
    addressLine1: body.addressLine1,
    addressLine2: body.addressLine2,
    city: body.city,
    state: body.state,
    zipCode: body.zipCode,
    country: body.country,
    notes: body.notes,
    isDefault: Boolean(body.isDefault),
  };

  if (!input.recipientName || !input.phone || !input.addressLine1 || !input.city) {
    throw new AppError('Recipient name, phone, address line 1, and city are required', 400);
  }

  return input;
}

export async function patchMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await updateProfile(req.user!.id, {
      name: typeof req.body.name === 'string' ? req.body.name : undefined,
      phone: typeof req.body.phone === 'string' ? req.body.phone : null,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        avatarUrl: user.avatar_url,
        role: user.role,
        emailVerified: Boolean(user.email_verified_at),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, addresses: await listAddresses(req.user!.id) });
  } catch (err) {
    next(err);
  }
}

export async function postAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await createAddress(req.user!.id, parseAddressInput(req.body));
    res.status(201).json({ success: true, address });
  } catch (err) {
    next(err);
  }
}

export async function putAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await updateAddress(req.user!.id, req.params.id, parseAddressInput(req.body));
    res.json({ success: true, address });
  } catch (err) {
    next(err);
  }
}

export async function removeAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteAddress(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
}

export async function exportMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await exportAccount(req.user!.id) });
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteAccount(req.user!.id);
    res.clearCookie('elecshop_session', {
      httpOnly: true,
      ...getCrossSiteCookieSecurityOptions(env.NODE_ENV),
      path: '/',
    });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
}
