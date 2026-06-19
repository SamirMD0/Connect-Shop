# Sentry Setup

This project has optional Sentry error tracking for both the Express backend and the Next.js frontend.

Sentry is disabled when the DSN variables are blank, so local development and CI can run without Sentry secrets.

## Create Sentry Projects

1. Create or open a Sentry organization.
2. Create one Node/Express project for the backend.
3. Create one Next.js project for the frontend.
4. Copy each project DSN into the matching environment file or hosting dashboard.

## Backend Environment

Set these for the backend service:

```env
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.0
```

Notes:

- Leave `SENTRY_DSN` blank to disable backend reporting.
- Keep `SENTRY_PROFILES_SAMPLE_RATE=0.0` unless profiling is intentionally enabled.
- Use a low trace sample rate in production and adjust after reviewing Sentry usage.

## Frontend Environment

Set these for the frontend deployment:

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

Optional source map upload settings:

```env
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

Source map upload is disabled unless all three source map variables are present. This keeps CI and local builds safe when secrets are missing.

## What Is Filtered

Backend and frontend Sentry events are filtered before sending. The filters redact keys that look like:

- passwords
- authorization headers
- cookies
- CSRF tokens
- session tokens
- API tokens
- secrets
- MFA/OTP values

Default PII sending is disabled. User context is reduced to the user id when Sentry receives a user object.

## What Not To Commit

Never commit:

- real Sentry DSNs in non-example files
- `SENTRY_AUTH_TOKEN`
- cookies
- session tokens
- MFA secrets or codes
- `.env` or `.env.local` files

## Local Verification

Backend:

1. Set `SENTRY_DSN` in `backend/.env`.
2. Run the backend.
3. Temporarily throw an error in a local test route or controller.
4. Confirm the issue appears in the backend Sentry project.
5. Remove the test error before committing.

Frontend:

1. Set `NEXT_PUBLIC_SENTRY_DSN` in `frontend/.env.local`.
2. Run the frontend.
3. Temporarily throw an error from a local-only test button or page.
4. Confirm the issue appears in the frontend Sentry project.
5. Remove the test error before committing.

## Production Notes

- Configure DSNs and source map secrets in the hosting provider dashboard, not in Git.
- Keep source map upload enabled only in trusted CI/deployment environments.
- Start with conservative sampling and increase only if needed.
- Review Sentry project privacy settings before launch.
- Confirm Sentry alerts route to the owner responsible for production support.

