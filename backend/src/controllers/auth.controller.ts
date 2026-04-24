// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import {
  upsertUser,
  createSession,
  destroySession,
  GoogleProfile,
} from '../services/auth.service';
import { AppError } from '../utils/errors';

const oauthClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

// Cookie configuration
const COOKIE_NAME = 'elecshop_session';

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: env.COOKIE_MAX_AGE,
    path: '/',
    signed: true,
  };
}

/**
 * GET /api/auth/google
 * Redirect user to Google OAuth consent screen.
 */
export async function googleLogin(_req: Request, res: Response): Promise<void> {
  const authorizeUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });

  res.redirect(authorizeUrl);
}

/**
 * GET /api/auth/google/callback
 * Handle the OAuth callback from Google.
 * Exchange code for tokens, get user profile, create session, set cookie, redirect.
 */
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      throw new AppError('Missing authorization code', 400);
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauthClient.getToken(code);

    if (!tokens.id_token) {
      throw new AppError('Failed to obtain ID token from Google', 500);
    }

    // Verify the ID token and extract user info
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email || !payload.name) {
      throw new AppError('Invalid token payload from Google', 500);
    }

    const profile: GoogleProfile = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    // Upsert user in database
    const user = await upsertUser(profile);

    // Create a session
    const sessionToken = await createSession(user.id);

    // Set secure httpOnly cookie
    res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions());

    // Redirect to frontend
    res.redirect(`${env.FRONTEND_URL}/auth/callback?success=true`);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user (from session cookie).
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  // user is attached by optionalAuth or requireAuth middleware
  const user = (req as any).user;

  if (!user) {
    res.json({ success: true, user: null });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
  });
}

/**
 * POST /api/auth/logout
 * Destroy the session and clear the cookie.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.signedCookies[COOKIE_NAME];

    if (token) {
      await destroySession(token);
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}
