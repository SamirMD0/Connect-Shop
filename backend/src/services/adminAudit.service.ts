import { query } from '../config/db';

export interface AdminAuditLogInput {
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  payload?: unknown;
}

export async function createAdminAuditLog(input: AdminAuditLogInput): Promise<void> {
  await query(
    `INSERT INTO admin_audit_logs (
       actor_id, action, target_type, target_id, request_id,
       ip_address, user_agent, status_code, payload
     )
     VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::inet, $7, $8, $9::jsonb)`,
    [
      input.actorId || null,
      input.action,
      input.targetType,
      input.targetId || null,
      input.requestId || null,
      input.ipAddress || '',
      input.userAgent || null,
      input.statusCode || null,
      input.payload === undefined ? null : JSON.stringify(input.payload),
    ]
  );
}
