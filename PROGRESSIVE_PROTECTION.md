# PROGRESSIVE PROTECTION

## 1. Purpose

Progressive protection adds lightweight friction only after suspicious authentication behavior. It is designed to slow brute-force attempts without making normal ecommerce browsing, checkout, cart, or admin workflows harder.

This phase does not add CAPTCHA, SMS OTP, WhatsApp OTP, online payments, alerts, or new business features.

## 2. Implemented Protections

### Failed Login Cooldown

The login endpoint checks recent security events before attempting password verification.

Thresholds:

- 10 failed login attempts for the same normalized email hash within 30 minutes.
- 30 failed login attempts from the same IP within 30 minutes.

Cooldown:

- 30 minutes.

During cooldown, login returns the generic message:

```text
Too many failed attempts. Please try again later.
```

The response does not say whether the email exists.

### Admin MFA Cooldown

Admin MFA remains enabled and unchanged.

Threshold:

- 5 failed MFA verification attempts for the same admin user within 15 minutes.

Cooldown:

- 15 minutes.

During cooldown, MFA verification returns the generic message:

```text
Too many failed attempts. Please try again later.
```

## 3. Event Logging

Progressive protection uses the existing `security_events` table.

Login events:

- `auth.login_failed`
- `auth.login_cooldown_triggered`
- `auth.login_blocked_cooldown`

MFA events:

- `auth.mfa_failed`
- `auth.mfa_cooldown_triggered`
- `auth.mfa_blocked_cooldown`

No separate `auth_attempts` table was added.

## 4. Privacy And Security Notes

The system does not store raw login emails for cooldown decisions. It stores a short server-side SHA-256 hash and a masked email in security event metadata.

The system does not log:

- Passwords
- Raw reset tokens
- Session cookies
- CSRF tokens
- Authorization headers
- Private keys
- Full request bodies

Cooldown decisions are intentionally generic so attackers cannot use responses to confirm whether an account exists.

## 5. What Is Intentionally Not Implemented

Not implemented in this phase:

- Real CAPTCHA provider.
- CAPTCHA UI.
- Account disablement.
- Permanent lockout.
- SMS OTP.
- WhatsApp OTP.
- Checkout CAPTCHA.
- Upload CAPTCHA.
- Behavior scoring or machine learning.
- Notification/alert sending.

## 6. CAPTCHA Strategy Later

If real abuse appears, add CAPTCHA only to targeted flows after suspicious behavior.

Reasonable future providers:

- Cloudflare Turnstile.
- hCaptcha.

Avoid challenging every page. In ecommerce, global CAPTCHA hurts browsing and checkout conversion.

Preferred future flow:

1. User fails login repeatedly.
2. Backend decides additional verification is required.
3. Login page shows CAPTCHA only for that suspicious flow.
4. Backend verifies CAPTCHA server-side.
5. Normal users avoid CAPTCHA entirely.

## 7. Testing Checklist

Login:

- Normal login succeeds.
- Wrong password fails with `Invalid email or password`.
- Unknown email and wrong password return similar generic failures.
- 10 failed attempts for the same email hash trigger cooldown.
- 30 failed attempts from the same IP trigger cooldown.
- During cooldown, login returns `Too many failed attempts. Please try again later.`
- Passwords are not logged.
- Raw emails are not stored in event metadata.

MFA:

- Valid MFA code succeeds.
- Invalid MFA code logs `auth.mfa_failed`.
- 5 failed MFA attempts trigger a 15-minute cooldown.
- Admin MFA remains enabled.

Regression:

- Register still works.
- Password reset still works.
- `authLimiter` still works.
- `/auth/me` still works.
- Cart still works.
- Checkout still works.
- Admin routes still require auth, permissions, and MFA.

## 8. Remaining Work

- Add CAPTCHA provider only if abuse appears.
- Add account lockout policy only if cooldowns are insufficient.
- Add admin UI for security events.
- Add alerting/monitoring for high-severity security events.
- Configure Cloudflare/WAF when a custom domain is ready.
