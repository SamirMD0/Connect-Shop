import { Request, Response, NextFunction } from 'express';
import {
  getAdminSecurityHealth,
  getSecurityAlerts,
  listAdminSecurityEvents,
} from '../services/adminSecurity.service';

export async function getSecurityHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await getAdminSecurityHealth();
    res.json({ success: true, health });
  } catch (err) {
    next(err);
  }
}

export async function getSecurityEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listAdminSecurityEvents({
      page: typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : undefined,
      limit: typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined,
      severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
      eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getSecurityAlertsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await getSecurityAlerts(typeof req.query.window === 'string' ? req.query.window : undefined);
    res.json({ success: true, alerts });
  } catch (err) {
    next(err);
  }
}
