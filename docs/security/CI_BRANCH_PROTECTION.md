# CI Branch Protection

Phase 1 CI is defined in `.github/workflows/ci.yml` as `Connect-shop CI`.

## Required Repository Rules

Configure branch protection for `main` in GitHub:

1. Require a pull request before merging.
2. Require status checks to pass before merging.
3. Require the `Connect-shop CI` workflow jobs to pass:
   - `Backend CI`
   - `Frontend CI`
   - `Security CI`
4. After the Phase 4B security workflows have passed reliably, also require:
   - `CodeQL JavaScript/TypeScript`
   - `Dependency Review`
5. Block direct pushes to `main`.
6. Require conversation resolution before merging.
7. Keep administrators included unless there is a specific operational reason to exempt them.

## Optional Later Hardening

Keep CodeQL and Dependency Review in observation mode until the first successful runs are confirmed in GitHub Actions. Once stable, add them to required status checks.

## Notes

The backend CI job uses PostgreSQL and Redis service containers with a test-only database named `connect_shop_test`. It loads the existing SQL schema, runs the existing migration command, then runs the backend test suite.
