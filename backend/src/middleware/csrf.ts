import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../config/env';
import { ForbiddenError } from '../utils/errors';
import { generateBrowserToken } from '../utils/crypto';

export const CSRF_COOKIE_NAME = 'elecshop_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCsrfCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.COOKIE_MAX_AGE,
    path: '/',
    signed: true,
  };
}

export function issueCsrfToken(res: Response): string {
  const token = generateBrowserToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
}

export function csrfProtection(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (!UNSAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const cookieToken = req.signedCookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenError('Invalid CSRF token');
    }

    next();
  } catch (err) {
    next(err);
  }
}
