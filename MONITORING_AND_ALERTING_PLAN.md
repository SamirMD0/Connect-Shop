# MONITORING AND ALERTING PLAN

## 1. Goal

Monitoring is needed so the operator knows when the ecommerce system is down, slow, broken, under attack, or failing to process orders. For Connect-Shop / ElecSHOP, the first production setup should be practical for a small business:

- Vercel frontend.
- Render backend.
- Render PostgreSQL.
- ImageKit for images.
- Redis optional for rate limiting and cache.
- Namecheap or another custom domain later.
- Cloudflare optional later when the custom domain is ready.

Monitoring does not replace backups, tests, staging checks, rate limiting, MFA, upload validation, or security controls. It tells the operator when something needs attention.

## 2. What Must Be Monitored

### Frontend

Monitor:

- Site availability.
- Homepage load.
- Store page load.
- Checkout page load.
- JavaScript errors.
- Hydration errors.
- Failed API calls.
- Core Web Vitals if available.

### Backend

Monitor:

- API health endpoint.
- 5xx errors.
- 4xx spikes.
- Slow requests.
- Auth failures.
- Checkout failures.
- Upload failures.
- Rate-limit hits.
- Redis errors.
- Database connection errors.

### Database

Monitor:

- Database availability.
- Storage usage.
- Connection count.
- Slow queries if the provider supports it.
- Backup status.
- Migration status.

### Images / ImageKit

Monitor:

- Image upload failures.
- Image delivery failures.
- Bandwidth usage.
- Transformation or optimization limits if applicable.

### Redis

Monitor:

- Redis availability.
- Rate-limit store health.
- Cache connection errors.
- Cache hit/miss if implemented or logged.
- Memory usage if the provider exposes it.

### Security

Monitor:

- Repeated failed login attempts.
- MFA failures.
- Rate-limit hits.
- Checkout abuse blocks.
- Upload rejection spikes.
- Suspicious `security_events`.
- Admin audit logs.
- Unusual admin mutations.

### Business Flow

Monitor:

- Order creation failures.
- Empty checkout errors.
- COD blocked attempts.
- Admin order update failures.
- Cart mutation errors.
- Product image upload errors.

## 3. Minimum Monitoring Stack

Start with a cheap and simple setup:

- Vercel dashboard and logs for the frontend.
- Render logs and metrics for the backend.
- Render PostgreSQL metrics and backups.
- ImageKit dashboard for image bandwidth and storage.
- UptimeRobot or Better Stack free/low tier for uptime checks.
- GitHub Actions build checks if configured.
- Manual log review at first.

Do not require expensive APM at the beginning. Optional later tools:

- Sentry for frontend/backend errors.
- Better Stack for uptime and logs.
- Logtail.
- Datadog or New Relic only later if the business grows.
- Cloudflare analytics after custom domain setup.

## 4. Uptime Checks

Required uptime checks:

- Frontend homepage: `https://yourdomain.com` or the Vercel staging URL.
- Backend health: `https://api.yourdomain.com/api/health` or the Render backend URL.
- Store page: `/store`.

Optional checks:

- `/contact`.
- `/checkout`.
- `/api/v1/homepage`.
- `/api/v1/products?limit=1`.

Rules:

- Do not check protected admin endpoints with real credentials.
- Do not spam checkout or order creation.
- Use safe `GET` endpoints only.
- Alert if the frontend or backend is down for more than 2-5 minutes.

## 5. Alert Severity Levels

### Critical

Examples:

- Backend down.
- Frontend down.
- Checkout/order creation broken.
- Database unavailable.
- Admin cannot log in.
- Image upload fully broken.
- Production secrets leaked.

### High

Examples:

- High 5xx error rate.
- Repeated checkout failures.
- Redis unavailable in production.
- Backup failed.
- Suspicious login spike.
- Upload rejection spike.

### Medium

Examples:

- Slow product search.
- Image bandwidth near limit.
- Rate-limit hits increasing.
- Failed admin actions.
- Frontend JavaScript errors increasing.

### Low

Examples:

- Minor UI errors.
- Occasional failed image.
- Non-critical warnings.
- Metadata warnings.

## 6. Alert Channels

For a solo developer or first client:

- Email alerts.
- WhatsApp/manual message from the monitoring tool if supported.
- Dashboard review.

For later:

- Slack or Discord webhook.
- SMS only for critical incidents.
- PagerDuty or Opsgenie only if the business grows.

Do not over-alert. Too many alerts become noise and get ignored.

## 7. What To Alert On

### Uptime

- Frontend unreachable for 2-5 minutes.
- Backend health endpoint unreachable for 2-5 minutes.

### Backend Errors

- 5xx error spike.
- Repeated database connection errors.
- Unhandled exception logs.
- Repeated ImageKit upload failures.
- Redis unavailable in production.

### Security

- Many failed login events in a short time.
- Many MFA failures.
- Checkout abuse blocks increasing.
- Upload rejections increasing.
- Many 429 rate-limit hits.
- Admin mutation spike.

### Business

- No orders for an unusually long period during expected business hours, optional later.
- Order creation failures.
- Admin order update failures.

### Storage / Limits

- PostgreSQL storage near limit.
- ImageKit bandwidth/storage near limit.
- Redis memory near limit.
- Render service resource usage high.

## 8. Log Review Plan

Review these logs daily or weekly during the early stage:

- Render backend logs.
- `security_events` table.
- `admin_audit_logs` table.
- Failed checkout/order logs.
- ImageKit upload errors.
- Redis errors.
- Frontend build/deployment logs.

Security logs should not contain passwords, tokens, cookies, private keys, raw uploaded files, or full request bodies.

## 9. Security Events Review

If the `security_events` table exists, review:

- `auth.login_failed`.
- `auth.login_cooldown_triggered`.
- `auth.mfa_failed`.
- `rate_limit.hit`.
- `checkout.cod_blocked_pending_orders`.
- `upload.rejected`.
- Admin suspicious events if implemented.

Recommended review frequency:

- Weekly for a small business.
- Daily during launch week.
- Immediately after suspicious spikes.

Do not build a UI in this phase unless one already exists. This phase is documentation only.

## 10. Backup Monitoring

Monitoring must connect to the backup plan. Check:

- Last database backup date.
- Backup file or provider snapshot exists.
- Backup restore is tested occasionally.
- Backup is taken before migrations.
- Render PostgreSQL backup retention.
- ImageKit image backup/original copy responsibility.

Alert if:

- Backup has not run in the expected window.
- Backup fails.
- Storage is near limit.

## 11. Incident Response Plan

Use this workflow:

1. Detect alert.
2. Confirm issue.
3. Check frontend, backend, and database logs.
4. Identify affected users and business flow.
5. Mitigate:
   - Roll back deployment.
   - Disable broken feature.
   - Restore service.
   - Pause admin changes.
   - Restore backup only if necessary.
6. Communicate with the client.
7. Document the incident.
8. Add a prevention task.

Examples:

- Backend down: confirm Render service status, check deploy logs, roll back if latest deploy caused it.
- Checkout broken: check backend 5xx logs, database errors, order insert failures, and recent deployments.
- Database error: check Render PostgreSQL availability, connection count, storage, and migration status.
- Image upload broken: check ImageKit credentials, quota, upload logs, and backend upload errors.
- Suspicious login attack: review `auth.login_failed`, cooldown events, IPs, and rate-limit hits.
- Fake COD order spike: review `checkout.cod_blocked_pending_orders`, order source patterns, and rate-limit activity.

## 12. Monitoring Checklist Before Launch

- [ ] Frontend uptime check created.
- [ ] Backend health uptime check created.
- [ ] Backend logs accessible.
- [ ] Frontend deployment logs accessible.
- [ ] Database metrics accessible.
- [ ] Backup status known.
- [ ] ImageKit dashboard accessible.
- [ ] Redis dashboard accessible if used.
- [ ] Alert email configured.
- [ ] `security_events` review process defined.
- [ ] `admin_audit_logs` review process defined.
- [ ] Incident response owner defined.
- [ ] Client knows who to contact if the site breaks.

## 13. Cost Impact

Free/cheap at first:

- Vercel logs.
- Render logs.
- Render metrics.
- ImageKit dashboard.
- UptimeRobot free/cheap.
- Manual review.

Paid later:

- Sentry.
- Better Stack.
- Datadog or New Relic.
- SMS alerts.
- Advanced log retention.

Monitoring can start at $0-10/month and grow later. Do not overpay before real traffic.

## 14. Recommended Starting Setup

For the first small-business launch, start with:

- UptimeRobot free/low tier:
  - Frontend homepage check.
  - Backend health check.
- Render dashboard/logs.
- Vercel dashboard/logs.
- ImageKit dashboard.
- Weekly manual review of:
  - `security_events`.
  - `admin_audit_logs`.
  - Failed orders/uploads.
- Email alerts to the developer/business owner.

No expensive APM is required yet.

## 15. Future Improvements

Later add:

- Sentry frontend/backend error tracking.
- Automated security event summary.
- Admin security-events dashboard.
- Daily backup success alert.
- Redis cache metrics.
- Cloudflare analytics after domain setup.
- Real-time admin order notifications.
- Slack/Discord alerts.
- Automated incident reports.

## 16. Final Verdict

For the first sellable version, lightweight uptime monitoring, provider logs, and manual security log review are enough.

Before serious public marketing, add Sentry, Better Stack, or a similar tool for better error visibility.
