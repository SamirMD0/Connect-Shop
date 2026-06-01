# SECURITY MONITORING

## 1. Purpose

The backend records lightweight security events so suspicious activity can be reviewed before adding progressive protections such as CAPTCHA, account lockout, or alerts.

This phase records events only. It does not automatically block users, send notifications, or change business logic.

## 2. Storage

Security events are stored in PostgreSQL in the `security_events` table.

Fields:

- `id`
- `event_type`
- `severity`
- `user_id`
- `session_id`
- `ip_address`
- `user_agent`
- `route`
- `method`
- `request_id`
- `metadata`
- `created_at`

Severities:

- `info`
- `warning`
- `high`
- `critical`

## 3. Logged Events

Authentication:

- `auth.login_failed`
- `auth.login_cooldown_triggered`
- `auth.login_blocked_cooldown`
- `auth.mfa_failed`
- `auth.mfa_cooldown_triggered`
- `auth.mfa_blocked_cooldown`
- `auth.password_reset_failed`
- `auth.invalid_session`
- `auth.required_missing`

Rate limits:

- `rate_limit.hit`

Checkout:

- `checkout.cod_blocked_pending_orders`
- `checkout.invalid_attempt`

Uploads:

- `upload.rejected`

Admin access:

- `admin.suspicious_action`

## 4. Metadata Policy

Security metadata is sanitized before storage.

The logger removes or redacts keys matching:

- `password`
- `token`
- `accessToken`
- `refreshToken`
- `session`
- `cookie`
- `authorization`
- `csrf`
- `privateKey`
- `secret`
- `file`
- `base64`
- `imageData`
- `dataUrl`

The logger also:

- Truncates long strings.
- Limits array length.
- Limits object keys.
- Limits nested depth.
- Omits buffers.
- Stores masked or hashed identifiers where useful.

Do not log full request bodies, raw images, raw reset tokens, session cookies, private keys, or passwords.

## 5. Manual Review Queries

Recent high-severity events:

```sql
SELECT event_type, severity, user_id, ip_address, route, method, metadata, created_at
FROM security_events
WHERE severity IN ('high', 'critical')
ORDER BY created_at DESC
LIMIT 100;
```

Rate-limit events by IP:

```sql
SELECT ip_address, COUNT(*) AS hits
FROM security_events
WHERE event_type = 'rate_limit.hit'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY hits DESC
LIMIT 50;
```

Failed login activity:

```sql
SELECT ip_address, metadata->>'emailHash' AS email_hash, COUNT(*) AS attempts
FROM security_events
WHERE event_type = 'auth.login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, metadata->>'emailHash'
ORDER BY attempts DESC
LIMIT 50;
```

Login cooldown triggers:

```sql
SELECT ip_address, metadata, created_at
FROM security_events
WHERE event_type IN ('auth.login_cooldown_triggered', 'auth.login_blocked_cooldown')
ORDER BY created_at DESC
LIMIT 100;
```

MFA cooldown triggers:

```sql
SELECT user_id, ip_address, metadata, created_at
FROM security_events
WHERE event_type IN ('auth.mfa_cooldown_triggered', 'auth.mfa_blocked_cooldown')
ORDER BY created_at DESC
LIMIT 100;
```

Upload rejection reasons:

```sql
SELECT metadata->>'reason' AS reason, COUNT(*) AS count
FROM security_events
WHERE event_type = 'upload.rejected'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY metadata->>'reason'
ORDER BY count DESC;
```

Checkout abuse blocks:

```sql
SELECT user_id, ip_address, metadata, created_at
FROM security_events
WHERE event_type = 'checkout.cod_blocked_pending_orders'
ORDER BY created_at DESC
LIMIT 100;
```

## 6. Privacy Notes

Keep event metadata narrow. Use event types, reason codes, masked values, and hashes instead of raw personal data.

Phone numbers should be masked. Email addresses should be masked and/or hashed. Addresses should not be stored in event metadata.

## 7. Retention

Suggested retention for a small ecommerce deployment:

- Keep `security_events` for 30-90 days.
- Keep `admin_audit_logs` according to business/legal needs.
- Delete old low-value security events periodically once a retention policy is chosen.

Example cleanup after 90 days:

```sql
DELETE FROM security_events
WHERE created_at < NOW() - INTERVAL '90 days';
```

Run cleanup only after confirming the business has no need for longer retention.

## 8. Future Work

Suggested future improvements:

- Admin-only security events page with filtering by severity, event type, user, and IP.
- Alerting for spikes in `auth.login_failed`, `rate_limit.hit`, and `checkout.cod_blocked_pending_orders`.
- Progressive CAPTCHA after suspicious behavior if cooldowns are insufficient.
- Account lockout policy only if temporary cooldowns are insufficient.
- Cloudflare/WAF setup when the custom domain is ready.
