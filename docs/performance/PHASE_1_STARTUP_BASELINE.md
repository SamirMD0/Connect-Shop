# Phase 1 startup baseline

Inspected base: `main`, commit `6d0d50815c82decb49727a5dc52c3d92920c7aee`.

## Current measurement status

Runtime timings have **not** been measured. The local Docker client is present, but
`docker info --format '{{.ServerVersion}}'` cannot connect to the Docker Desktop Linux
engine pipe. No existing disposable PostgreSQL environment was explicitly identified.
Do not infer startup timings from offline test duration. Do not start the backend
against an unverified database: its normal startup launches session/cart cleanup writes.

## What the instrumentation measures

Backend Pino logs contain `Startup readiness` events:

- `startupPhase: configuration`, `durationMs`: dotenv loading and environment schema
  construction/validation. It excludes earlier module imports. This success event is
  emitted after the logger is available; validation failures retain the existing error exit.
- `startupPhase: database`, `durationMs`, `attempts`, `outcome`: connection plus readiness
  query, including existing retry waits. The final failure log carries these fields too.
- `startupPhase: listening`, `processElapsedMs`: elapsed Node process lifetime at the
  listening callback, including imports, configuration, database readiness, and optional
  initialization. It excludes npm/watcher startup and any preceding migration process.

These startup events are always enabled and do not include connection strings or data.
The existing retry, initialization, and deployment behavior is unchanged.

With backend `PERF_LOGGING_ENABLED=true`, `Performance homepage response` logs every
completed GET aggregate response whose essential sections succeeded, including fast
responses and cache hits. The first such response per process has
`startupPhase: first_homepage` and `homepageResponse: first`; subsequent responses have
`homepageResponse: warm`. Optional-section failures still count as usable responses;
essential failures, HTTP errors, HEAD requests and aborted responses do not consume
the first marker. `durationMs` measures backend middleware entry through response
finish; `processElapsedMs` records process age. These labels describe process response
order, not database/cache warmth or frontend/browser completion. Builds and prefetches
can consume the first marker before a user visit.

With frontend `PERF_LOGGING_ENABLED=true`, `[perf][frontend][homepage-aggregate]` records
one completed aggregate operation with a fixed endpoint, outcome, and `durationMs`.
It includes response body consumption/parsing, records fast warm responses as well as
failures, and does not log URLs with origins, headers, body contents, or error details.
Existing slow-fetch logging measures time to response headers; existing render timing
includes aggregate loading plus render preparation. Neither measures browser hydration.
A hung operation still has no application deadline in this phase and produces no
completed aggregate timing until it settles.

## Prerequisites for runtime measurements

1. Explicitly verify a newly created disposable local PostgreSQL database containing
   synthetic data only. Record its owner, database name, loopback host/port, PostgreSQL
   version, and confirmation that it shares no production volume or remote endpoint.
2. Initialize its schema/migrations and optional synthetic catalog before timing.
   `npm run db:deploy` writes data/schema and is permitted only after that verification.
   Do not change migration execution or time setup as application readiness.
3. Use existing installed dependencies; record Node/npm versions and hardware.
   Ensure ports 3500 (frontend), 5500 (backend), and 55432 (example database) are available.
4. Use the synthetic environment below in dedicated terminals. Never use live service
   keys or production data. Start without Redis for a clearly recorded uncached baseline.
   A later Redis comparison requires an explicitly verified disposable local Redis too;
   record cache state without clearing a shared instance.
5. Inspect requests only against loopback URLs. Record catalog size, CMS section count,
   environment mode, build state, and whether processes/database/Redis were already warm.

## Development commands

The database URL below is a synthetic example, not a database that this phase created.
Replace it only with the verified disposable local target; do not print actual credentials.

Backend terminal (from repository root):

```powershell
Set-Location backend
$env:NODE_ENV = 'development'
$env:PORT = '5500'
$env:DATABASE_URL = 'postgresql://phase1:phase1_local_only@127.0.0.1:55432/connect_shop_phase1_disposable'
$env:DIRECT_DATABASE_URL = $env:DATABASE_URL
$env:SESSION_SECRET = 'synthetic_phase1_local_session_secret_only'
$env:GOOGLE_CLIENT_ID = 'local_placeholder'
$env:GOOGLE_CLIENT_SECRET = 'local_placeholder'
$env:GOOGLE_CALLBACK_URL = 'http://127.0.0.1:5500/api/v1/auth/google/callback'
$env:FRONTEND_URL = 'http://127.0.0.1:3500'
$env:REDIS_URL = ''
$env:INITIALIZE_DATABASE = 'false'
$env:RESEND_API_KEY = ''
$env:SENTRY_DSN = ''
$env:IMAGEKIT_PUBLIC_KEY = ''
$env:IMAGEKIT_PRIVATE_KEY = ''
$env:IMAGEKIT_URL_ENDPOINT = ''
$env:INTERNAL_SSR_API_SECRET = ''
$env:LOG_PRETTY = 'false'
$env:PERF_LOGGING_ENABLED = 'false'
Get-Date -Format o
npm run dev
```

Backend performance logging stays off to keep this run focused on the always-enabled
startup events rather than enabling existing slow-query/runtime logging.

Frontend terminal (from repository root):

```powershell
Set-Location frontend
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:5500'
$env:INTERNAL_API_URL = 'http://127.0.0.1:5500'
$env:NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3500'
$env:INTERNAL_SSR_API_SECRET = ''
$env:NEXT_PUBLIC_SENTRY_DSN = ''
$env:SENTRY_AUTH_TOKEN = ''
$env:PERF_LOGGING_ENABLED = 'true'
$env:PERF_SLOW_FETCH_MS = '0'
$env:PERF_SLOW_RENDER_MS = '0'
Get-Date -Format o
npm run dev -- --hostname 127.0.0.1 --port 3500
```

After backend listening and Next.js Ready, use a third terminal. Do not request `/`
before the first timed visit or let a browser prefetch it.

```powershell
curl.exe --silent --show-error --max-time 10 --output NUL --write-out "health status=%{http_code} total_s=%{time_total}\n" http://127.0.0.1:5500/api/health
curl.exe --silent --show-error --max-time 120 --output NUL --write-out "first status=%{http_code} ttfb_s=%{time_starttransfer} total_s=%{time_total}\n" http://127.0.0.1:3500/
1..3 | ForEach-Object {
  curl.exe --silent --show-error --max-time 120 --output NUL --write-out "warm status=%{http_code} ttfb_s=%{time_starttransfer} total_s=%{time_total}\n" http://127.0.0.1:3500/
}
```

Record independently:

- **Process readiness:** backend configuration/database/listening events; frontend
  terminal Ready timing. Record launcher timestamps if npm/watcher overhead matters.
- **Development compilation:** first `/` request's Next.js compile timing if shown.
  If the installed version does not separate compilation, mark that value unavailable;
  do not equate first-minus-warm response time with compilation.
- **First homepage:** first curl TTFB/full-body time and matching aggregate/render logs.
- **Warm homepage:** subsequent curl samples and aggregate/render logs in the same run.

Curl's 120-second bound is only a measurement-tool limit. A timeout is an incomplete
measurement, not a completed response or an application timeout. HTTP 200 alone is
insufficient: confirm aggregate outcome and absence of section-fallback warnings.
Curl does not load images, run client authentication/cart code, or measure hydration.
For usable-page/LCP timings, repeat in a clean browser profile with synthetic data,
record Network/Performance traces, and label browser-cache state separately.

## Production process comparison

Builds are a separate preparation step, not startup. In the same verified local
backend environment, `npm run build` then `npm start` exercises the compiled backend.
Keep NODE_ENV=development for a local baseline without external ImageKit credentials;
label this as compiled-backend readiness, not full production-mode verification.

In the frontend terminal, stop dev, run `npm run build`, set `$env:PORT='3500'` and
`$env:HOSTNAME='127.0.0.1'`, then run `npm start`. Builds may fetch catalog data and warm
the backend; record that condition. Repeat the first/warm curl commands after restart.
This measures standalone frontend readiness and avoids development route compilation.
Do not invoke Docker/Render migration or bootstrap startup paths against any live target.

## Offline verification commands

From repository root, with existing dependencies:

```powershell
node backend/node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 backend/tests/env.redis-url.test.ts frontend/tests/unit/homepage-timing.test.ts
node backend/node_modules/typescript/bin/tsc --project backend/tsconfig.json --noEmit
node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit --incremental false
```

The Redis regression tests are included in the backend npm test script. Do not run that
full script without a verified disposable database: other existing tests write data.
The focused commands above do not load real dotenv files or connect to services.
## Phase 1 verification results

- Five Redis regression checks passed after correcting malformed test fixtures to
  match the unchanged generic URL validator; four homepage timing checks passed.
- Backend TypeScript check passed with no output emission.
- Frontend TypeScript check passed with incremental output disabled.
- Targeted frontend ESLint completed with zero errors and three existing purity
  warnings on unchanged render-timing `performance.now()` calls in `src/app/page.tsx`.
- `git diff --check` passed. Existing untracked frontend instruction files were preserved.
- No services were started, database writes performed, integrations exercised, or
  production targets contacted. No runtime timing baseline is claimed.

Next phase: obtain the verified disposable environment and collect the separate
readiness/compilation/first/warm measurements above. Homepage application deadlines,
retry/migration changes, caching, and rendering changes require a later phase.
