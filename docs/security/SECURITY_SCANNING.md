# Security Scanning

This repository uses layered automated scanning for pull requests and the `main` branch. Automated tools are not a replacement for code review, but they catch common dependency and code-pattern risks early.

## CodeQL

Workflow: `.github/workflows/codeql.yml`

CodeQL scans JavaScript and TypeScript code for security issues such as injection risks, unsafe data flow, insecure API usage, and common web application vulnerabilities.

CodeQL runs on:

- Pull requests targeting `main`
- Pushes to `main`
- Weekly scheduled scan

The workflow uses `build-mode: none` because this TypeScript/JavaScript project can be analyzed without a full production build. CodeQL results appear in GitHub under **Security > Code scanning alerts**.

## npm Audit

Workflow: `.github/workflows/ci.yml`, job `Security CI`

The existing CI installs backend and frontend dependencies and runs:

```bash
npm audit --audit-level=high
```

for both packages. High and critical dependency vulnerabilities should block pull requests when practical. Low and moderate findings should be reviewed, but this project does not currently block every PR on lower-severity dependency noise.

## Semgrep

Workflow: `.github/workflows/ci.yml`, job `Security CI`

Semgrep runs the OWASP Top 10 ruleset through:

```yaml
semgrep/semgrep-action@v1
```

This checks for common application security patterns such as injection, insecure configuration, authentication mistakes, and unsafe request handling. Semgrep findings should be reviewed before merging.

## Dependency Review

Workflow: `.github/workflows/dependency-review.yml`

Dependency Review runs on pull requests and inspects dependency changes before they are merged. It fails the PR when newly introduced dependencies include known high or critical vulnerabilities.

This is different from npm audit:

- Dependency Review focuses on what the PR changes.
- npm audit checks the resolved dependency tree in each package.

## What Should Block PR Merge

Recommended blocking checks after they pass reliably:

- `Backend CI`
- `Frontend CI`
- `Security CI`
- `CodeQL JavaScript/TypeScript`
- `Dependency Review`

High or critical dependency vulnerabilities, broken CodeQL execution, and Semgrep security findings should be treated as merge blockers unless there is a documented false positive or accepted risk.

## Manual Review Still Required

Automated scanners do not fully understand business logic. Reviewers should still manually check:

- Authentication and authorization changes
- Checkout, cart, and order logic
- Admin role and permission changes
- Database migrations and destructive data operations
- Environment variable handling
- File upload and external integration changes

## AI Review

AI review can help spot issues, but it is optional and should not be treated as the primary security layer. GitHub Actions, CodeQL, Dependency Review, npm audit, Semgrep, tests, and human review remain the authoritative gates.

See `docs/review/AI_CODE_REVIEW.md` for the optional AI pull request review setup notes and ecommerce-specific review checklist.
