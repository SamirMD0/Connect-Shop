# Optional AI Pull Request Review

AI review can be useful as an extra reviewer for pull requests, especially for spotting missed edge cases, unclear code, missing tests, or security-sensitive changes. It must stay optional for this project. CodeQL, Dependency Review, npm audit, Semgrep, backend tests, frontend builds, and human review remain the trusted gates.

## Tool Status

The exact product name "Rabbit Code AI" was not verified as a separate GitHub integration. The likely matching tool is CodeRabbit.

CodeRabbit was verified as a GitHub Marketplace app that reviews pull requests, summarizes changes, and leaves line-level suggestions. The Marketplace listing describes PR summaries and code suggestions. CodeRabbit's pricing page shows a free tier and a free open-source plan, while full private-repository review features may require a trial or paid plan.

Useful references:

- CodeRabbit GitHub Marketplace: https://github.com/marketplace/coderabbitai
- CodeRabbit pricing: https://www.coderabbit.ai/pricing

Because pricing and permissions can change, verify the current GitHub installation screen before enabling it.

## Recommended Setup

Use AI review as a non-blocking assistant only.

1. Open the CodeRabbit GitHub Marketplace page.
2. Install the GitHub App.
3. Choose **Only select repositories**.
4. Select only the Connect-shop / ElecSHOP repository.
5. Review the requested permissions carefully.
6. Allow PR review/comment permissions only if you are comfortable with the app commenting on pull requests.
7. Do not make AI review a required branch protection check.
8. Keep CodeQL, Semgrep, npm audit, Dependency Review, and tests as the required security layers.

The public Marketplace page confirms the app exists and supports PR review behavior, but the exact permission list must be checked during installation. Treat permissions as sensitive because PR review tools often need repository read access and comment/check permissions.

## Safe Usage Rules

- Do not grant access to all repositories unless needed.
- Do not paste secrets, `.env` values, tokens, API keys, passwords, MFA codes, or private customer data into AI comments.
- Do not accept AI suggestions blindly.
- Do not let AI review override failing CI, failing tests, or security scanner findings.
- Do not use AI review as proof that checkout, auth, role permissions, or money logic is safe.
- Manually verify every suggested code change before applying it.
- Re-run tests after applying AI suggestions.

## Ecommerce Review Checklist

Use this checklist when reviewing AI comments or asking for a manual review.

### Authentication / Authorization

- Does this change alter login, logout, session validation, MFA, role checks, or admin permissions?
- Can a normal admin perform a super-admin-only action?
- Are customer-only, admin-only, and super-admin-only routes still protected server-side?
- Does the backend enforce authorization even if the frontend hides controls?
- Are sessions revoked when sensitive role changes happen?
- Are cookies configured securely for the intended environment?

### Checkout / Money Logic

- Does this change affect totals, subtotals, quantity, delivery fee, discounts, or COD order creation?
- Are prices calculated from trusted backend/database values instead of client-submitted values?
- Can a customer submit a negative quantity, zero-price order, or modified total?
- Does checkout still reject invalid or unavailable cart items?
- Does the order confirmation show accurate payment wording for Cash on Delivery?
- Are failed order submissions visible without creating duplicate orders?

### Database / SQL

- Are SQL queries parameterized?
- Are user-controlled sort, filter, limit, or order values whitelisted?
- Does any migration drop, recreate, or rewrite production data?
- Are foreign key delete behaviors safe for order history?
- Are order item snapshots preserved after product deletion?
- Are new indexes non-destructive and not duplicates of existing constraints?

### Cart / Orders

- Can cart updates accidentally affect another user's cart?
- Are product IDs, variant IDs, and quantities validated server-side?
- Does deleting a product avoid deleting historical order records?
- Are order status changes permission-protected?
- Are order totals and item snapshots stable after product or price changes?
- Are duplicate submissions handled safely?

### Redis / Cache

- Does cached data include secrets, tokens, passwords, or private customer information?
- Are cache keys scoped by user when data is user-specific?
- Is cache invalidated after product, category, homepage, or promotion changes?
- Does the app work safely when Redis is disabled or down?
- Are rate limiters still effective with Redis enabled and with fallback behavior?

### Frontend

- Does the UI call existing APIs without changing backend business rules?
- Are buttons, links, and form controls accessible by role or label?
- Are destructive actions confirmed through the existing admin pattern?
- Does the change work on 375px mobile, tablet, and desktop?
- Are loading, empty, and error states clear?
- Is any client-side-only security decision backed by server-side enforcement?

### Security

- Are secrets filtered from logs, Sentry, security events, and UI output?
- Are file uploads restricted by type, size, and storage path?
- Are rate limits preserved for auth, MFA, checkout, uploads, admin reads, and sensitive actions?
- Are CORS, CSRF, cookies, and session settings unchanged unless intentionally reviewed?
- Does the change avoid raw HTML injection or unsafe rendering?
- Are AI suggestions checked for insecure shortcuts or broad permission changes?

### Testing

- Are backend tests updated for auth, permissions, checkout, cart, order, or database changes?
- Does `npm test` pass in the backend?
- Does the frontend build pass?
- Is Playwright E2E updated when the main checkout path changes?
- Are migrations tested with the project migration command?
- Is manual QA documented when automated tests are not practical?

## Interpreting AI Comments

AI comments are hints, not decisions.

Treat comments as useful when they point to:

- Missing authorization checks
- Untested business logic
- Unsafe SQL or unvalidated inputs
- Race conditions
- Poor error handling
- Confusing or inaccessible UI
- Missing migration or rollback risks

Be cautious with comments that:

- Suggest large refactors unrelated to the PR
- Weaken security to simplify code
- Move trusted calculations from backend to frontend
- Change checkout, auth, or role logic without tests
- Add dependencies without a clear need
- Ignore existing project patterns

Before accepting an AI suggestion, confirm the behavior against the codebase, apply the smallest safe fix, and run the relevant tests.

## Suggested PR Template Section

No pull request template was added in this phase. If a template is added later, include this section:

```markdown
## AI Review

- [ ] Optional AI review was run
- [ ] AI comments were manually reviewed
- [ ] Accepted AI suggestions were tested
- [ ] No AI suggestion changed auth, checkout, order totals, permissions, or database behavior without human review
- [ ] No secrets, tokens, passwords, MFA codes, cookies, or customer private data were shared in AI prompts/comments
```

## Removal

If CodeRabbit or another AI review app is no longer wanted:

1. Open GitHub repository or organization settings.
2. Go to GitHub Apps / Installed GitHub Apps.
3. Select the AI review app.
4. Remove repository access or uninstall the app.
5. Confirm pull requests no longer receive AI comments.

## Project Recommendation

For this ecommerce project, AI review is acceptable as an optional assistant. It should not be a required merge gate until the team has verified its cost, noise level, permission model, and usefulness on real pull requests.

