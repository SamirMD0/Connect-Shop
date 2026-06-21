# Documentation Index

This index organizes the project documentation by purpose. Root-level docs outside this folder and legacy `project-docs/` files are still linked where they remain useful.

## Current Status Notes

- Cloudflare/WAF is documented but skipped until a custom domain is available.
- ImageKit production upload is implemented/documented, but production still requires valid Render environment variables.
- Redis is implemented for distributed rate limiting and public read-through caching; production value depends on `REDIS_URL` and provider capacity.
- Upstash free tier is not suitable for repeated medium load testing.
- No `STAGING_DEPLOYMENT_TEST_PLAN.md` or `STAGING_SMOKE_TEST_CHECKLIST.md` file was found during this documentation pass. Use [`deployment/LAUNCH_CHECKLIST.md`](deployment/LAUNCH_CHECKLIST.md) and [`../project-docs/PRODUCTION_CHECKLIST.md`](../project-docs/PRODUCTION_CHECKLIST.md) until dedicated staging checklists are created.

## Start Here

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../README.md`](../README.md) | Main project overview, setup, deployment summary, and documentation links. | Developers, reviewers, client technical contact. | ready |
| [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) | Organized documentation map. | Everyone. | ready |
| [`review/PHASES_COMPLETION_SUMMARY.md`](review/PHASES_COMPLETION_SUMMARY.md) | Summary of major planning, hardening, deployment, and documentation phases. | Developer, reviewer. | ready |

## System Design

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`SystemDesign/ERASER_SYSTEM_DESIGNS.md`](SystemDesign/ERASER_SYSTEM_DESIGNS.md) | Eraser.io diagram code for architecture, ERD, auth, checkout, admin, and deployment. | Developer, reviewer, portfolio audience. | ready |
| [`../project-docs/PROJECT_TECHNICAL_AUDIT_AND_SCALABILITY_REVIEW.md`](../project-docs/PROJECT_TECHNICAL_AUDIT_AND_SCALABILITY_REVIEW.md) | Technical architecture, scalability, security, and sellability audit. | Developer, reviewer, technical buyer. | ready |
| [`../project-docs/REDIS_CACHE_POLICY.md`](../project-docs/REDIS_CACHE_POLICY.md) | Redis caching scope, cache keys, and invalidation policy. | Developer, DevOps reviewer. | ready |

## Deployment And Operations

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`deployment/DEPLOYMENT_PRODUCTION_GUIDE.md`](deployment/DEPLOYMENT_PRODUCTION_GUIDE.md) | Vercel, Render, PostgreSQL, Redis, ImageKit, env vars, migrations, validation, and rollback notes. | Developer, operator. | ready |
| [`deployment/PHASE_N_FINAL_DEPLOYMENT_VALIDATION.md`](deployment/PHASE_N_FINAL_DEPLOYMENT_VALIDATION.md) | Final deployment validation record for URLs, health checks, COD order validation, admin validation, Redis/log status, and k6 smoke results. | Developer, operator, reviewer. | pending deployed URLs |
| [`deployment/PRODUCTION_INFRASTRUCTURE_SCALING_PLAN.md`](deployment/PRODUCTION_INFRASTRUCTURE_SCALING_PLAN.md) | Production infrastructure scaling plan and staging load-test requirements. | Developer, operator, reviewer. | ready |
| [`deployment/LAUNCH_CHECKLIST.md`](deployment/LAUNCH_CHECKLIST.md) | Final launch checklist for technical, storefront, admin, and business checks. | Developer, operator, client owner. | ready |
| [`deployment/BACKUP_AND_RESTORE.md`](deployment/BACKUP_AND_RESTORE.md) | Backup and restore notes for the current docs set. | Developer, operator. | ready |
| [`deployment/SENTRY_SETUP.md`](deployment/SENTRY_SETUP.md) | Sentry setup notes if monitoring is enabled. | Developer, operator. | ready |
| [`../project-docs/DEPLOYMENT_GUIDE.md`](../project-docs/DEPLOYMENT_GUIDE.md) | Legacy Vercel, Render, PostgreSQL, ImageKit, Redis, domain, and launch verification guide. | Developer, operator. | ready |
| [`../project-docs/PRODUCTION_CHECKLIST.md`](../project-docs/PRODUCTION_CHECKLIST.md) | Pre-launch production checklist. | Developer, operator, reviewer. | ready |
| [`../project-docs/BACKUP_AND_RECOVERY.md`](../project-docs/BACKUP_AND_RECOVERY.md) | Database backup, restore, storage, and emergency recovery plan. | Developer, operator, client owner. | ready |
| [`../project-docs/IMAGEKIT_SETUP.md`](../project-docs/IMAGEKIT_SETUP.md) | ImageKit setup, upload rules, Render env vars, and troubleshooting. | Developer, operator. | ready |
| [`../MONITORING_AND_ALERTING_PLAN.md`](../MONITORING_AND_ALERTING_PLAN.md) | Uptime, alerting, log review, backup monitoring, and incident response. | Developer, operator, client owner. | ready |

## Performance

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`performance/PERFORMANCE_SCALING_PLAN.md`](performance/PERFORMANCE_SCALING_PLAN.md) | Main performance scaling plan and phase tracker. | Developer, reviewer. | active |
| [`performance/PERFORMANCE_BASELINE_RESULTS.md`](performance/PERFORMANCE_BASELINE_RESULTS.md) | Phase A baseline measurement notes. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_B_RESULTS.md`](performance/PERFORMANCE_PHASE_B_RESULTS.md) | Public-read limiter results. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_C_RESULTS.md`](performance/PERFORMANCE_PHASE_C_RESULTS.md) | Public-read cache validation results. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_D_RESULTS.md`](performance/PERFORMANCE_PHASE_D_RESULTS.md) | Homepage API fan-out reduction results. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_E_RESULTS.md`](performance/PERFORMANCE_PHASE_E_RESULTS.md) | Database/index validation results. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_G_RESULTS.md`](performance/PERFORMANCE_PHASE_G_RESULTS.md) | Load-test validation and p99 investigation. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_H_RESULTS.md`](performance/PERFORMANCE_PHASE_H_RESULTS.md) | Performance phase H results. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_I_RESULTS.md`](performance/PERFORMANCE_PHASE_I_RESULTS.md) | Performance phase I results and commands. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_J_PUBLIC_READ_LIMITER_STRATEGY.md`](performance/PERFORMANCE_PHASE_J_PUBLIC_READ_LIMITER_STRATEGY.md) | Public-read limiter strategy and evidence. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_K_RESULTS.md`](performance/PERFORMANCE_PHASE_K_RESULTS.md) | Performance phase K results. | Developer, reviewer. | complete |
| [`performance/PERFORMANCE_PHASE_L_REDIS_CAPACITY.md`](performance/PERFORMANCE_PHASE_L_REDIS_CAPACITY.md) | Redis capacity and load-test guidance. | Developer, operator. | complete |

## Client Delivery

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`client/ADMIN_GUIDE.md`](client/ADMIN_GUIDE.md) | Admin operating guide for products, categories, orders, homepage CMS, and safety rules. | Client admin, support person. | ready |
| [`client/CLIENT_HANDOVER_CHECKLIST.md`](client/CLIENT_HANDOVER_CHECKLIST.md) | Handover checklist for production, credentials, training, and acceptance. | Developer, client owner. | ready |
| [`client/MAINTENANCE_AND_SUPPORT.md`](client/MAINTENANCE_AND_SUPPORT.md) | Maintenance scope, support expectations, hosting responsibility, and paid changes. | Developer, client owner. | ready |
| [`client/KNOWN_LIMITATIONS.md`](client/KNOWN_LIMITATIONS.md) | Product limitations and future upgrades to explain before selling. | Developer, client owner, reviewer. | ready |
| [`../project-docs/SELLABLE_VERSION_CHECKLIST.md`](../project-docs/SELLABLE_VERSION_CHECKLIST.md) | Checklist for the first sellable small-business version. | Developer, reviewer, client technical contact. | ready |

## Security

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`security/SECURITY_SCANNING.md`](security/SECURITY_SCANNING.md) | Security scanning process and AI review notes. | Developer, security reviewer. | ready |
| [`security/CI_BRANCH_PROTECTION.md`](security/CI_BRANCH_PROTECTION.md) | CI and branch protection notes. | Developer, repo maintainer. | ready |
| [`security/CHECKOUT_ABUSE_PROTECTION_STATUS.md`](security/CHECKOUT_ABUSE_PROTECTION_STATUS.md) | Checkout abuse-protection status and evidence. | Developer, security reviewer. | ready |
| [`../RATE_LIMITING_AND_API_SECURITY_AUDIT.md`](../RATE_LIMITING_AND_API_SECURITY_AUDIT.md) | Rate limiting, Redis, WAF, abuse scenarios, and API security review. | Developer, security reviewer. | ready |
| [`../PROGRESSIVE_PROTECTION.md`](../PROGRESSIVE_PROTECTION.md) | Login/MFA cooldown strategy and remaining CAPTCHA/lockout work. | Developer, security reviewer. | ready |
| [`../SECURITY_MONITORING.md`](../SECURITY_MONITORING.md) | Security event logging, review queries, and retention guidance. | Developer, operator, security reviewer. | ready |
| [`../CLOUDFLARE_WAF_SETUP.md`](../CLOUDFLARE_WAF_SETUP.md) | Cloudflare DNS, proxy, WAF, and edge protection guide. | Developer, DevOps reviewer. | skipped until domain |

## Testing

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`testing/E2E_TESTING.md`](testing/E2E_TESTING.md) | End-to-end testing notes. | Developer, reviewer. | ready |

## Review And Business Readiness

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`review/AI_CODE_REVIEW.md`](review/AI_CODE_REVIEW.md) | Optional AI pull request review setup notes and ecommerce checklist. | Developer, reviewer. | ready |
| [`review/FINAL_GEMINI_REVIEW.md`](review/FINAL_GEMINI_REVIEW.md) | Final Gemini review notes. | Gemini/reviewer, developer. | ready |
| [`review/FINAL_GEMINI_REVIEW_PACKAGE.md`](review/FINAL_GEMINI_REVIEW_PACKAGE.md) | Ready-to-use independent review package for Gemini. | Gemini/reviewer, developer. | ready |
| [`review/FINAL_PRODUCTION_COST_REVIEW.md`](review/FINAL_PRODUCTION_COST_REVIEW.md) | Final cost review summary for the selected stack. | Developer, reviewer, business owner. | ready |
| [`review/PHASES_COMPLETION_SUMMARY.md`](review/PHASES_COMPLETION_SUMMARY.md) | Summary of major planning, hardening, deployment, and documentation phases. | Developer, reviewer. | ready |
| [`../FINAL_PRODUCTION_READINESS_VERDICT.md`](../FINAL_PRODUCTION_READINESS_VERDICT.md) | Official final QA launch verdict, smoke test checklist, and risk register. | Gemini/reviewer, developer, business owner. | final decision |

## Legacy Planning References

| File | Purpose | Who Should Read It | Status |
|---|---|---|---|
| [`../.claude/PROJECT_SUMMARY_AND_BUSINESS_READINESS.md`](../.claude/PROJECT_SUMMARY_AND_BUSINESS_READINESS.md) | Business positioning and sellability assessment. | Developer, reviewer, business owner. | useful legacy planning |
| [`../.claude/CONNECT_SHOP_COST_ESTIMATE.md`](../.claude/CONNECT_SHOP_COST_ESTIMATE.md) | Earlier hosting cost estimate. | Developer, reviewer. | useful legacy planning |
| [`../project-docs/TODO.md`](../project-docs/TODO.md) | Small internal TODO list. | Developer. | needs update |
| [`../.claude/architecture.md`](../.claude/architecture.md) | Earlier architecture planning notes. | Developer. | optional |
| [`../.claude/backend.md`](../.claude/backend.md) | Earlier backend planning notes. | Developer. | optional |
| [`../.claude/frontend.md`](../.claude/frontend.md) | Earlier frontend planning notes. | Developer. | optional |
| [`../.claude/dashboard.md`](../.claude/dashboard.md) | Earlier dashboard planning notes. | Developer. | optional |
| [`../.claude/website-audit.md`](../.claude/website-audit.md) | Earlier website audit notes. | Developer. | optional |
| [`../.claude/PHANTOM_UI_IMPLEMENTATION_PLAN.md`](../.claude/PHANTOM_UI_IMPLEMENTATION_PLAN.md) | Earlier UI implementation plan. | Developer. | optional |
| [`../.claude/NEXTMERCE_UI_REBUILD_PLAN.md`](../.claude/NEXTMERCE_UI_REBUILD_PLAN.md) | Earlier NextMerce rebuild plan. | Developer. | optional |
| [`../.claude/NEXTMERCE_DEMO_PARITY_AUDIT.md`](../.claude/NEXTMERCE_DEMO_PARITY_AUDIT.md) | Earlier demo parity audit. | Developer. | optional |
| [`../.claude/HOMEPAGE_CMS_PLAN.md`](../.claude/HOMEPAGE_CMS_PLAN.md) | Earlier homepage CMS plan. | Developer. | optional |
| [`../.claude/HOMEPAGE_CMS_API_CHECKLIST.md`](../.claude/HOMEPAGE_CMS_API_CHECKLIST.md) | Earlier homepage CMS API checklist. | Developer. | optional |
| [`../.claude/Feature Enhancements.md`](<../.claude/Feature Enhancements.md>) | Earlier enhancement ideas. | Developer. | optional |
