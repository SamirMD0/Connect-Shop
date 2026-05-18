import { Request, Response, NextFunction } from 'express';
import { createAdminAuditLog } from '../services/adminAudit.service';
import { logger } from '../utils/logger';

const AUDITED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip;
}

function getTargetType(req: Request): string {
  const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
  const adminIndex = segments.indexOf('admin');

  if (adminIndex >= 0 && segments[adminIndex + 1]) {
    return segments[adminIndex + 1];
  }

  const carouselAdminIndex = segments.findIndex((segment, index) =>
    segment === 'carousel' && segments[index + 1] === 'admin'
  );

  if (carouselAdminIndex >= 0) {
    return 'carousel';
  }

  return 'admin';
}

export function adminAudit(req: Request, res: Response, next: NextFunction): void {
  if (!AUDITED_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    if (!req.user || req.user.role !== 'admin') return;

    void createAdminAuditLog({
      actorId: req.user.id,
      action: req.method,
      targetType: getTargetType(req),
      targetId: req.params.id,
      requestId: String(req.id || res.getHeader('X-Request-ID') || ''),
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      payload: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req.body : undefined,
    }).catch((err) => {
      logger.error({ err }, 'Failed to write admin audit log');
    });
  });

  next();
}
