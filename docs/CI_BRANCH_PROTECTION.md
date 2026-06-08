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
4. Block direct pushes to `main`.
5. Require conversation resolution before merging.
6. Keep administrators included unless there is a specific operational reason to exempt them.

## Optional Later Hardening

CodeQL can be added in Phase 4 as a separate security workflow once the project is ready for deeper production hardening.

## Notes

The backend CI job uses PostgreSQL and Redis service containers with a test-only database named `connect_shop_test`. It loads the existing SQL schema, runs the existing migration command, then runs the backend test suite.
