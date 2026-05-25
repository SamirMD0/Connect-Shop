import { cleanupExpiredSessions } from './auth.service';
import { cleanupExpiredCartItems } from './cart.service';
import { logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export async function runMaintenanceCleanup(): Promise<{
  expiredSessions: number;
  expiredCartItems: number;
}> {
  const [expiredSessions, expiredCartItems] = await Promise.all([
    cleanupExpiredSessions(),
    cleanupExpiredCartItems(),
  ]);

  logger.info({ expiredSessions, expiredCartItems }, 'Maintenance cleanup completed');
  return { expiredSessions, expiredCartItems };
}

export function startMaintenanceScheduler(intervalMs = DEFAULT_INTERVAL_MS): ReturnType<typeof setInterval> {
  void runMaintenanceCleanup().catch((err) => {
    logger.error({ err }, 'Maintenance cleanup failed');
  });

  return setInterval(() => {
    void runMaintenanceCleanup().catch((err) => {
      logger.error({ err }, 'Maintenance cleanup failed');
    });
  }, intervalMs);
}
