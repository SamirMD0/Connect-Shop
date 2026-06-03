# DOCUMENTATION INDEX

This index keeps the existing documentation in place and links to it by purpose. Files were not moved because many existing links already point to `project-docs/`, root-level security docs, and client handover docs.

## Current Status Notes

- Cloudflare/WAF is documented but skipped until a custom domain is available.
- ImageKit production upload is implemented/documented, but production still requires valid Render environment variables.
- Redis is implemented for distributed rate limiting and documented for public read-through caching; production value depends on `REDIS_URL`.
- Some readiness ratings are audit snapshots from different phases. Treat the newest final review package as the source for review workflow, not as a guarantee of launch readiness.
- No `STAGING_DEPLOYMENT_TEST_PLAN.md` or `STAGING_SMOKE_TEST_CHECKLIST.md` file was found during this documentation pass. Use `docs/LAUNCH_CHECKLIST.md` and `project-docs/PRODUCTION_CHECKLIST.md` until dedicated staging checklists are created.
- Older `.claude/` files are useful planning references, but the main public project docs should be read from `README.md`, `docs/`, `project-docs/`, and root-level security/operations docs.

## Project / Business

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../README.md`](../README.md) | Main project overview, setup, deployment summary, and documentation links. | Developers, reviewers, client technical contact. | ready |
| [`../.claude/PROJECT_SUMMARY_AND_BUSINESS_READINESS.md`](../.claude/PROJECT_SUMMARY_AND_BUSINESS_READINESS.md) | Business positioning and sellability assessment. | Developer, reviewer, business owner. | useful legacy planning |
| [`../project-docs/SELLABLE_VERSION_CHECKLIST.md`](../project-docs/SELLABLE_VERSION_CHECKLIST.md) | Checklist for the first sellable small-business version. | Developer, reviewer, client technical contact. | ready |
| [`../.claude/CONNECT_SHOP_COST_ESTIMATE.md`](../.claude/CONNECT_SHOP_COST_ESTIMATE.md) | Earlier hosting cost estimate. | Developer, reviewer. | useful legacy planning |
| [`FINAL_PRODUCTION_COST_REVIEW.md`](FINAL_PRODUCTION_COST_REVIEW.md) | Final cost review summary for the selected stack. | Developer, reviewer, business owner. | ready |
| [`../project-docs/TODO.md`](../project-docs/TODO.md) | Small internal TODO list. | Developer. | needs update |

## Technical

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../project-docs/PROJECT_TECHNICAL_AUDIT_AND_SCALABILITY_REVIEW.md`](../project-docs/PROJECT_TECHNICAL_AUDIT_AND_SCALABILITY_REVIEW.md) | Technical architecture, scalability, security, and sellability audit. | Developer, reviewer, technical buyer. | ready |
| [`../project-docs/REDIS_CACHE_POLICY.md`](../project-docs/REDIS_CACHE_POLICY.md) | Redis caching scope, cache keys, and invalidation policy. | Developer, DevOps reviewer. | ready |
| [`../.claude/architecture.md`](../.claude/architecture.md) | Earlier architecture planning notes. | Developer. | optional |
| [`../.claude/backend.md`](../.claude/backend.md) | Earlier backend planning notes. | Developer. | optional |
| [`../.claude/frontend.md`](../.claude/frontend.md) | Earlier frontend planning notes. | Developer. | optional |
| [`../.claude/dashboard.md`](../.claude/dashboard.md) | Earlier dashboard planning notes. | Developer. | optional |

## Security

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../RATE_LIMITING_AND_API_SECURITY_AUDIT.md`](../RATE_LIMITING_AND_API_SECURITY_AUDIT.md) | Rate limiting, Redis, WAF, abuse scenarios, and API security review. | Developer, security reviewer. | ready |
| [`../PROGRESSIVE_PROTECTION.md`](../PROGRESSIVE_PROTECTION.md) | Login/MFA cooldown strategy and remaining CAPTCHA/lockout work. | Developer, security reviewer. | ready |
| [`../SECURITY_MONITORING.md`](../SECURITY_MONITORING.md) | Security event logging, review queries, and retention guidance. | Developer, operator, security reviewer. | ready |
| [`../CLOUDFLARE_WAF_SETUP.md`](../CLOUDFLARE_WAF_SETUP.md) | Cloudflare DNS, proxy, WAF, and edge protection guide. | Developer, DevOps reviewer. | skipped until domain |

## Production / Deployment

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../project-docs/DEPLOYMENT_GUIDE.md`](../project-docs/DEPLOYMENT_GUIDE.md) | Vercel, Render, PostgreSQL, ImageKit, Redis, domain, and launch verification guide. | Developer, operator. | ready |
| [`../project-docs/PRODUCTION_CHECKLIST.md`](../project-docs/PRODUCTION_CHECKLIST.md) | Pre-launch production checklist. | Developer, operator, reviewer. | ready |
| [`../project-docs/BACKUP_AND_RECOVERY.md`](../project-docs/BACKUP_AND_RECOVERY.md) | Database backup, restore, storage, and emergency recovery plan. | Developer, operator, client owner. | ready |
| [`../project-docs/IMAGEKIT_SETUP.md`](../project-docs/IMAGEKIT_SETUP.md) | ImageKit setup, upload rules, Render env vars, and troubleshooting. | Developer, operator. | ready |
| [`../MONITORING_AND_ALERTING_PLAN.md`](../MONITORING_AND_ALERTING_PLAN.md) | Uptime, alerting, log review, backup monitoring, and incident response. | Developer, operator, client owner. | ready |
| [`../docs/LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) | Final launch checklist for technical, storefront, admin, and business checks. | Developer, operator, client owner. | ready |
| `STAGING_DEPLOYMENT_TEST_PLAN.md` | Dedicated staging deployment test plan. | Developer, reviewer. | needs update |
| `STAGING_SMOKE_TEST_CHECKLIST.md` | Dedicated staging smoke-test checklist. | Developer, reviewer. | needs update |

## Client Delivery

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) | Admin operating guide for products, categories, orders, homepage CMS, and safety rules. | Client admin, support person. | ready |
| [`CLIENT_HANDOVER_CHECKLIST.md`](CLIENT_HANDOVER_CHECKLIST.md) | Handover checklist for production, credentials, training, and acceptance. | Developer, client owner. | ready |
| [`MAINTENANCE_AND_SUPPORT.md`](MAINTENANCE_AND_SUPPORT.md) | Maintenance scope, support expectations, hosting responsibility, and paid changes. | Developer, client owner. | ready |
| [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) | Product limitations and future upgrades to explain before selling. | Developer, client owner, reviewer. | ready |

## Final Review

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../FINAL_PRODUCTION_READINESS_VERDICT.md`](../FINAL_PRODUCTION_READINESS_VERDICT.md) | Official final QA launch verdict, smoke test checklist, and risk register. | Gemini/reviewer, developer, business owner. | final decision |
| [`FINAL_GEMINI_REVIEW_PACKAGE.md`](FINAL_GEMINI_REVIEW_PACKAGE.md) | Ready-to-use final independent review package for Gemini. | Gemini/reviewer, developer. | ready |
| [`PHASES_COMPLETION_SUMMARY.md`](PHASES_COMPLETION_SUMMARY.md) | Summary of major planning, hardening, deployment, and documentation phases. | Developer, reviewer. | ready |

## Other Planning Files

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../.claude/website-audit.md`](../.claude/website-audit.md) | Earlier website audit notes. | Developer. | optional |
| [`../.claude/PHANTOM_UI_IMPLEMENTATION_PLAN.md`](../.claude/PHANTOM_UI_IMPLEMENTATION_PLAN.md) | Earlier UI implementation plan. | Developer. | optional |
| [`../.claude/NEXTMERCE_UI_REBUILD_PLAN.md`](../.claude/NEXTMERCE_UI_REBUILD_PLAN.md) | Earlier NextMerce rebuild plan. | Developer. | optional |
| [`../.claude/NEXTMERCE_DEMO_PARITY_AUDIT.md`](../.claude/NEXTMERCE_DEMO_PARITY_AUDIT.md) | Earlier demo parity audit. | Developer. | optional |
| [`../.claude/HOMEPAGE_CMS_PLAN.md`](../.claude/HOMEPAGE_CMS_PLAN.md) | Earlier homepage CMS plan. | Developer. | optional |
| [`../.claude/HOMEPAGE_CMS_API_CHECKLIST.md`](../.claude/HOMEPAGE_CMS_API_CHECKLIST.md) | Earlier homepage CMS API checklist. | Developer. | optional |
| [`../.claude/Feature Enhancements.md`](<../.claude/Feature Enhancements.md>) | Earlier enhancement ideas. | Developer. | optional |
