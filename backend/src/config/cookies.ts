import type { CookieOptions } from 'express';

type CookieSecurityOptions = Pick<CookieOptions, 'secure' | 'sameSite'>;

export function getCrossSiteCookieSecurityOptions(nodeEnv: string): CookieSecurityOptions {
  const isProduction = nodeEnv === 'production';

  return {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
}
