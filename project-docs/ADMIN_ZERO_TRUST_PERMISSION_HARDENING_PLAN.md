# Admin Zero-Trust Permission Hardening Plan

## Executive Recommendation

For ElecSHOP, the best production security approach is practical and route-based:

- Keep the existing QR-code authenticator MFA flow.
- Add fresh MFA for sensitive admin and security actions.
- Properly separate `admin` from `super_admin`.
- Use route-based limits, not global role limits like `user = 50`, `admin = 100`, `super_admin = 500`.
- Allow higher `super_admin` limits only for safe dashboard GET/read traffic.
- Keep auth, MFA, checkout, uploads, role changes, security settings, and admin mutations strict.
- Backend enforcement must be the source of truth. Frontend hiding is only a usability layer.

The first implementation work should be backend enforcement: split permissions, make role management super-admin-only, protect the last active super admin, revoke sessions after role changes, and require fresh MFA for dangerous actions.

## Scope

This plan covers the existing admin role, permission, MFA, audit, and rate-limit strategy for ElecSHOP. It is an implementation plan only. It does not change backend logic, frontend UI, database schema, auth/session behavior, or environment files.

## Implementation Status

The zero-trust hardening phases have been implemented and regression-tested:

- Permissions are split between customer visibility and role administration.
- `admin` no longer has the same backend permissions as `super_admin`.
- Role mutation is guarded by `admin_roles`, fresh MFA, a sensitive-action limiter, and service-level super-admin checks.
- Self role changes and last-active-super-admin demotion are blocked.
- Successful role changes revoke target sessions.
- Role/security actions write explicit sanitized security events.
- Admin dashboard reads use a separate role-aware read limiter.
- Sensitive role changes use a strict dedicated limiter.

## A. Current Role And Permission Summary

Current backend permissions are defined in `backend/src/middleware/admin.ts` and mirrored in `frontend/src/lib/adminPermissions.ts`:

- `analytics`
- `products`
- `orders`
- `customers`
- `admin_roles`
- `reviews`
- `content`
- `homepage`
- `marketing`
- `security`
- `settings`

Current role mapping:

| Role | Current permissions |
| --- | --- |
| `super_admin` | analytics, products, orders, customers, admin_roles, reviews, content, homepage, marketing, security, settings |
| `admin` | analytics, products, orders, customers, reviews, content, homepage, marketing |
| `manager` | analytics, products, orders, reviews, content, homepage, marketing |
| `support` | analytics, orders, customers, reviews |
| `customer` | none |

Important current behavior after hardening:

- `super_admin` is the only role with `admin_roles`, `security`, and `settings`.
- Customer list/detail routes use `customers`.
- Role changes are exposed through `PUT /api/v1/admin/users/:id/role`.
- The role-change route is protected by `requireAdminPermission('admin_roles')`, `sensitiveAdminActionLimiter`, and `requireFreshAdminMfa(10)`.
- `updateUserRole` confirms the actor from the database, blocks non-super-admin actors, blocks self role changes, rejects invalid roles, protects the last active `super_admin`, and revokes target sessions after successful changes.
- Admin routes require MFA through `requireAdminMfa`, while sensitive role changes also require recent MFA.
- Admin requests are logged through `adminAudit`, and high-value role/MFA/rate-limit events are written to `security_events`.
- Frontend admin permissions mirror the backend permission model.
- The admin customers page hides role controls unless the current user has `admin_roles`.

## B. Security Problems And Risks

### Critical

1. `admin` and `super_admin` are effectively the same.
   - This removes the security value of having a separate `super_admin` role.
   - Any compromise of an `admin` account can become full role and user control.

2. Role management is protected by `users`, not a dedicated privileged permission.
   - `users` currently means both customer visibility and role mutation.
   - Viewing customers is much lower risk than changing admin roles.

3. Non-super-admin users with `users` permission can attempt role changes.
   - Backend must enforce super-admin-only role mutation.
   - Frontend hiding alone is not sufficient.

4. No full last-super-admin protection.
   - The system should block deletion, demotion, disabling, or lockout of the final active `super_admin`.
   - This must be checked in the database transaction that performs the sensitive mutation.

5. No fresh MFA for role changes.
   - Existing MFA proves the session was verified at some point.
   - Sensitive operations should require recent MFA, for example within the last 10 minutes.

### Important

1. Self role changes are only partially blocked.
   - Current logic blocks removing own admin access below `admin`.
   - It should block all self role mutations.

2. Role changes should revoke target user sessions.
   - After demotion, existing sessions may reload the updated role from the database, but forced session revocation is still safer.
   - Role elevation should also invalidate old sessions so the user must log in and complete MFA again.

3. Audit logs are generic.
   - `adminAudit` logs route, method, target, status, and payload.
   - Role changes should also create explicit high-value security events with old role, new role, actor, target, and reason.

4. Customer management and admin role management are mixed.
   - A support or manager user may need customer/order visibility.
   - They should not receive access to role controls.

5. Frontend role dropdown is too direct.
   - Role changes should require a dedicated modal with warnings, fresh MFA status, and clear confirmation.

### Later

1. Create a full permission matrix UI.
   - Not needed immediately if roles stay controlled and hardcoded.

2. Add richer admin security event dashboards.
   - Useful once sensitive role/security events are consistently logged.

3. Add a break-glass recovery process.
   - Useful for production operations if all super admins lose access.

## C. Recommended Role Hierarchy

Keep roles simple and controlled:

| Role | Purpose |
| --- | --- |
| `super_admin` | Owner-level access. Can manage admins, roles, security settings, and all admin areas. |
| `admin` | Store administrator. Can manage products, orders, customers, content, marketing, reviews, homepage, and analytics. Cannot manage roles or security settings. |
| `manager` | Operational manager. Can manage products, orders, reviews, content, homepage, marketing, and analytics. Cannot manage users or roles. |
| `support` | Customer support. Can view analytics summary, manage orders, view customers, and moderate reviews. Cannot manage products, content, marketing, users, or roles. |
| `customer` | Public shopper account. No admin access. |

## D. Recommended Permission Model

Recommended permissions:

- `analytics`
- `products`
- `orders`
- `customers`
- `reviews`
- `content`
- `homepage`
- `marketing`
- `admin_roles`
- `security`
- `settings`

Permission meaning:

| Permission | Meaning |
| --- | --- |
| `analytics` | Admin dashboard and reporting. |
| `products` | Products, categories, brands, inventory, and catalog uploads. |
| `orders` | Orders, tracking, returns, and fulfillment actions. |
| `customers` | Customer visibility and support profile access. |
| `reviews` | Review moderation. |
| `content` | Generic homepage CMS, carousel, and content areas. |
| `homepage` | Controlled homepage blocks and homepage section ordering. |
| `marketing` | Promotions and coupons. |
| `admin_roles` | Role assignment and admin privilege management. Super-admin only. |
| `security` | Security events, audit logs, MFA reset, and security settings. Super-admin only. |
| `settings` | Future platform settings. Super-admin only unless narrowed later. |

Recommended role mapping:

| Role | Recommended permissions |
| --- | --- |
| `super_admin` | all permissions |
| `admin` | analytics, products, orders, customers, reviews, content, homepage, marketing |
| `manager` | analytics, products, orders, reviews, content, homepage, marketing |
| `support` | analytics, orders, customers, reviews |
| `customer` | none |

Clarifications:

- Replace or split the current `users` permission.
- `customers` is for customer visibility and support work.
- `admin_roles` is for role assignment.
- `security` is for security logs, audit logs, MFA reset, and security settings.
- `homepage` is for homepage blocks and section ordering.
- Do not keep role assignment behind the broad `users` permission.

## E. Super Admin Rules

Backend must enforce these rules:

1. `super_admin` is the only role that can manage roles.

2. `admin` cannot:
   - Promote users to `admin`.
   - Promote users to `super_admin`.
   - Demote `super_admin`.
   - Delete or disable `super_admin`.
   - Change any user's role.

3. Nobody can change their own role.
   - This includes self-promotion and self-demotion.

4. Nobody can remove, demote, delete, disable, or lock out the last active `super_admin`.

5. Role changes must be transactional.
   - Lock the actor and target user rows where needed.
   - Check actor role from the database.
   - Check target current role.
   - Check active super-admin count if the target is `super_admin`.
   - Update role.
   - Revoke target sessions.
   - Write audit/security events.

6. Role changes must revoke target user sessions.
   - Downgrade: target must log in again with reduced privileges.
   - Upgrade: target must log in again and complete MFA before using elevated privileges.

7. Role and security actions must be audit logged.
   - Log successful actions.
   - Log denied attempts.
   - Mark last-super-admin attempts as critical.

## F. Fresh MFA / Step-Up Plan

The existing QR-code TOTP MFA is good and should stay.

Current admin MFA should continue to protect normal admin dashboard access. Normal dashboard access should not require a fresh code on every page load.

Add fresh MFA only for dangerous operations:

- Role changes.
- Admin creation.
- Admin disable/delete.
- Super-admin demotion or promotion.
- MFA reset for another admin.
- Security settings changes.
- Audit/security log export.
- Other admin-control actions that can lock people out or expose sensitive security data.

Do not require fresh MFA for every small product, order, homepage, content, or marketing edit. That would slow down normal operations without adding enough security value.

Recommended backend middleware:

- `requireFreshAdminMfa(10)`

Behavior:

- Requires authenticated admin user.
- Requires `mfa_enabled = true`.
- Requires current session `mfa_verified_at` within the last 10 minutes.
- Returns a clear `403` response such as `Fresh MFA verification required`.

Recommended frontend behavior:

- If backend returns fresh-MFA-required, show a modal asking for a 6-digit authenticator code.
- On successful MFA verification, retry the original action once.
- Do not silently bypass or repeatedly retry dangerous actions.

## Rate Limit Strategy For Real Ecommerce

Use route-based and role-aware limits. Do not use simple global role limits like `user = 50`, `admin = 100`, `super_admin = 500`.

Recommended model:

| Area | Suggested limit |
| --- | --- |
| General public/API reads | Around 600 requests / 15 min |
| Auth/login/MFA | Strict, around 20 requests / 15 min or stricter |
| Checkout/order creation | Strict, around 5 / hour |
| Cart/wishlist mutations | Around 60 / 15 min |
| Reviews/questions | Around 10 / hour |
| Admin dashboard GET/read - support/manager/admin | Around 200 / 15 min |
| Admin dashboard GET/read - super_admin | Around 500 / 15 min |
| Admin mutations - admin/manager/support | Around 100 / 15 min |
| Admin mutations - super_admin | Around 100-150 / 15 min max |
| Sensitive security/admin-role actions | Around 10-20 / hour, fresh MFA required, audit logged |

Important guidance:

- `500 / 15 min` for `super_admin` is acceptable only for safe dashboard GET/read requests.
- `500 / 15 min` is not acceptable for writes, auth, MFA, checkout, uploads, role changes, or security actions.
- Super admins can need higher read limits because dashboards often fan out into many safe read requests.
- Super admins should not get huge write limits.
- Admin write limits should remain controlled because accidental or compromised write traffic can damage products, homepage content, orders, promotions, and security.
- Do not solve frontend excessive refetching by raising backend limits. Fix the frontend request pattern first.

## G. Audit Logging Plan

Keep the existing `admin_audit_logs` middleware, but add explicit security events for role/security actions.

Recommended event types:

- `admin.role_change_requested`
- `admin.role_changed`
- `admin.role_change_denied`
- `admin.role_change_self_denied`
- `admin.last_super_admin_change_denied`
- `admin.sessions_revoked_after_role_change`
- `admin.fresh_mfa_required`
- `admin.fresh_mfa_verified`
- `admin.security_action_limited`
- `admin.security_settings_changed`

Each role-change event should include sanitized metadata:

- `actorId`
- `targetUserId`
- `targetEmailMasked`
- `oldRole`
- `newRole`
- `reason`
- `requestId`
- `ipAddress`
- `userAgent`

Do not log:

- Raw session tokens.
- Cookies.
- MFA secrets.
- Passwords.
- Full sensitive payloads.

Severity guidance:

- Successful role change: `high`
- Denied non-super-admin role change: `high`
- Last-super-admin demotion attempt: `critical`
- Self role change attempt: `high`
- Fresh MFA missing: `warning`
- Sensitive action rate limit hit: `high`

## H. Backend Implementation Phases

### Phase 1: Permission Model Cleanup

Files likely involved:

- `backend/src/middleware/admin.ts`
- `backend/src/routes/admin.routes.ts`
- `frontend/src/lib/adminPermissions.ts`
- Admin route permission usage

Tasks:

1. Add new permission union values:
   - `customers`
   - `admin_roles`
   - `security`
   - `settings`
   - `homepage`

2. Update role permission map:
   - Remove full parity between `admin` and `super_admin`.
   - Give `admin_roles`, `security`, and `settings` only to `super_admin`.

3. Replace `requireAdminPermission('users')`:
   - Customer list/detail routes use `customers`.
   - Role mutation route uses `admin_roles`.

4. Keep route behavior stable for customer support views.

### Phase 2: Super-Admin-Only Role Mutation Service

Files likely involved:

- `backend/src/routes/admin.routes.ts`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/services/admin.service.ts`
- `backend/src/services/securityEvent.service.ts`

Tasks:

1. Add backend guard for role mutations:
   - Route guard: `requireAdminPermission('admin_roles')`.
   - Service guard: actor must currently be `super_admin` in the database.

2. Block all self role changes.

3. Reject all role changes from non-super-admin users.

4. Return clean errors for denied role changes.

5. Log denied attempts as security events.

### Phase 3: Last-Super-Admin Protection And Session Revocation

Files likely involved:

- `backend/src/services/admin.service.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/services/securityEvent.service.ts`

Tasks:

1. Add transactional role update logic.

2. Block demotion, deletion, disabling, or lockout of the final active `super_admin`.

3. Revoke target user sessions after every role change.

4. Log successful role changes and session revocation.

5. Add tests for last-super-admin protection.

### Phase 4: Fresh MFA For Sensitive Actions

Files likely involved:

- `backend/src/middleware/mfa.ts`
- `backend/src/services/mfa.service.ts`
- `backend/src/routes/admin.routes.ts`
- `frontend/src/app/admin/layout.tsx`

Tasks:

1. Add `requireFreshAdminMfa(10)`.

2. Apply it to:
   - Role changes.
   - Admin creation.
   - Admin disable/delete.
   - MFA reset.
   - Security settings.
   - Audit/security log export.

3. Keep normal admin dashboard access on existing MFA.

4. Do not require fresh MFA for every product/order/content edit.

### Phase 5: Security And Audit Event Hardening

Files likely involved:

- `backend/src/services/adminAudit.service.ts`
- `backend/src/services/securityEvent.service.ts`
- `backend/src/middleware/adminAudit.ts`

Tasks:

1. Keep generic `adminAudit` middleware.

2. Add explicit security events in role/security service methods.

3. Ensure payload sanitization redacts sensitive fields.

4. Add event types for role changes, denied role changes, fresh-MFA requirements, and sensitive-action rate-limit hits.

### Phase 6: Frontend Role-Management Modal

Files likely involved:

- `frontend/src/app/admin/customers/page.tsx`
- `frontend/src/lib/adminPermissions.ts`
- Existing admin modal/toast components

Tasks:

1. Hide role controls unless current user has `admin_roles`.

2. Replace inline role dropdown with a dedicated "Change role" action.

3. Use a confirmation modal.

4. Show:
   - Target user.
   - Current role.
   - New role.
   - Warning that sessions will be revoked.

5. Disable self role changes in UI.

6. Handle fresh-MFA-required responses cleanly.

### Phase 7: Role-Aware Admin Read Limiter

Files likely involved:

- `backend/src/middleware/rateLimiter.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/services/securityEvent.service.ts`

Tasks:

1. Add an `adminReadLimiter` for authenticated admin GET/HEAD safe routes.

2. Place it after `requireAuth` and `isAdmin` so `req.user.role` is available.

3. Use role-aware read limits:
   - `support`, `manager`, `admin`: around 200 / 15 min.
   - `super_admin`: around 500 / 15 min.

4. Keep unauthenticated traffic out of admin limits.

5. Keep `generalLimiter` unchanged unless there is a specific reason.

6. Keep logging rate-limit hits.

7. Use this only for safe read traffic. Do not apply super-admin read limits to mutations.

### Phase 8: Sensitive Admin Action Limiter

Files likely involved:

- `backend/src/middleware/rateLimiter.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/middleware/mfa.ts`
- `backend/src/services/securityEvent.service.ts`

Applies to:

- Role changes.
- Admin creation.
- Admin disable/delete.
- MFA reset.
- Security settings.
- Audit/security log export.

Rules:

- Strict limit: around 10-20 / hour.
- Fresh MFA required.
- Audit all attempts.
- Log rate-limit hits as security events.
- Do not give `super_admin` huge sensitive-action limits.

### Phase 9: Tests And Manual QA

Add tests only using the project's existing backend test pattern.

Core backend tests:

1. `admin` cannot update roles.

2. `super_admin` can update roles.

3. Role mutation rejects invalid role.

4. Actor cannot change own role.

5. Last `super_admin` cannot be demoted.

6. Role update revokes target sessions.

7. Role update requires fresh MFA.

8. Role update writes audit/security event.

9. Customer list still works for roles with `customers`.

10. Customer list does not imply role mutation access.

11. Admin read limiter gives super admin higher GET/read budget only.

12. Sensitive action limiter stays strict for every admin role.

## I. Frontend Implementation Plan

1. Update permission constants.
   - Add `customers`, `admin_roles`, `security`, `settings`, `homepage`.
   - Match backend exactly.

2. Update admin sidebar.
   - Customers page uses `customers`.
   - Homepage page uses `homepage` or temporarily keep `content` until backend route permissions move.
   - Security page appears only for `security` if added.

3. Update customers page.
   - Keep customer details visible to `customers`.
   - Remove inline role dropdown for users without `admin_roles`.
   - For super admins, use a controlled modal flow.

4. Add fresh MFA handling.
   - Centralize handling of `Fresh MFA verification required`.
   - Prompt for MFA code.
   - Retry intended action once after successful verification.

5. Keep frontend as a convenience layer only.
   - Never rely on frontend checks for security.
   - Backend remains the source of truth.

## J. Test Plan

### Backend Automated Tests

Authorization:

- Customer cannot access admin routes.
- Support cannot access role mutation route.
- Manager cannot access role mutation route.
- Admin cannot access role mutation route.
- Super admin can access role mutation route.

Role mutation:

- Invalid role rejected.
- Missing role rejected.
- Self role change rejected.
- Last super admin demotion rejected.
- Super admin can promote customer to support.
- Super admin can promote admin if allowed.
- Super admin can demote admin.
- Target sessions revoked after role change.

Fresh MFA:

- Sensitive route rejected when MFA is not verified.
- Sensitive route rejected when MFA is stale.
- Sensitive route accepted when MFA is fresh.
- Normal admin read routes do not require fresh MFA after regular MFA is complete.

Rate limits:

- General public/API reads keep normal read budget.
- Auth/login/MFA stays strict.
- Checkout/order creation stays strict.
- Admin GET/read routes use role-aware read limits.
- Super admin gets higher GET/read budget only.
- Admin mutations do not inherit the super-admin read budget.
- Sensitive role/security actions stay at 10-20 / hour.

Audit/security:

- Successful role change logs event.
- Denied role change logs event.
- Last-super-admin attempt logs critical event.
- Sensitive-action rate-limit hit logs event.

Regression:

- Customer list still works.
- Orders/products/content routes still use expected permissions.
- Existing QR-code MFA setup and verification still work.

### Manual QA

1. Log in as support.
   - Confirm admin access is limited.
   - Confirm role controls are hidden.
   - Confirm direct role API call is rejected.

2. Log in as admin.
   - Confirm products/orders/content work.
   - Confirm role controls are hidden.
   - Confirm direct role API call is rejected.

3. Log in as super admin.
   - Confirm role controls appear.
   - Confirm role change modal works.
   - Confirm fresh MFA is requested for sensitive change.
   - Confirm target user is forced to log in again after role change.

4. Attempt last-super-admin demotion.
   - Confirm backend rejects it.
   - Confirm UI displays a clean error.

5. Exercise admin dashboard read traffic.
   - Confirm normal admins have a reasonable read budget.
   - Confirm super admins get higher dashboard read budget.
   - Confirm write limits remain strict.

## Anti-Patterns To Avoid

- Do not give `super_admin` 500 write requests.
- Do not protect role changes with broad `users` permission.
- Do not rely on frontend hiding for security.
- Do not allow self role changes.
- Do not allow deleting, disabling, demoting, or locking out the last active `super_admin`.
- Do not weaken auth, login, or MFA rate limits.
- Do not increase checkout or upload limits casually.
- Do not solve frontend excessive refetching by raising backend limits.
- Do not store MFA secrets or session tokens in logs.
- Do not require fresh MFA for every small product/order/content edit.
- Do not remove the existing QR-code TOTP MFA flow.
- Do not replace REST or introduce GraphQL for this.

## K. Final Recommendation

Implement this in this order:

1. Permission model cleanup.
2. Super-admin-only role mutation service.
3. Last-super-admin protection and session revocation.
4. Fresh MFA for sensitive actions.
5. Security and audit event hardening.
6. Frontend role-management modal.
7. Role-aware admin read limiter.
8. Sensitive admin action limiter.
9. Tests and manual QA.

The highest-value first fix is backend enforcement. The backend currently treats `admin` and `super_admin` as equivalent and allows role mutation through the broad `users` permission. Fixing that boundary first gives the project the largest security improvement with the least risk.

For rate limits, use route-based controls. Give `super_admin` extra room only for safe dashboard reads. Keep writes, auth, MFA, checkout, uploads, role changes, and security actions strict.
