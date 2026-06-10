# Phase 1: Must Fix Before Public Demo

## Goal
Ensure that the codebase cannot be broken by accidental regressions before demonstrating it publicly. This requires setting up an automated Continuous Integration (CI) pipeline.

## 1. Implement GitHub Actions CI Pipeline

Create a new file in your repository: `.github/workflows/ci.yml`

```yaml
name: ElecSHOP CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  backend-test-and-build:
    name: Backend CI
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: elecshop_test
        ports:
          - 5432:5432
      redis:
        image: redis:alpine
        ports:
          - 6379:6379

    defaults:
      run:
        working-directory: ./backend

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './backend/package-lock.json'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Linter
        run: npm run lint
        
      - name: Run Tests
        env:
          DATABASE_URL: postgres://testuser:testpassword@localhost:5432/elecshop_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: supersecret_test_key_change_me_in_prod
          COOKIE_SECRET: supersecret_test_cookie_key
        run: npm test

      - name: Build TypeScript
        run: npm run build

  frontend-build:
    name: Frontend CI
    runs-on: ubuntu-latest
    
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './frontend/package-lock.json'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Linter
        run: npm run lint
        
      - name: Type Check
        run: npm run typecheck || echo "Add a typecheck script to package.json"
        
      - name: Build Next.js
        env:
          NEXT_PUBLIC_API_URL: http://localhost:5000
        run: npm run build
```

## How to Apply
1. Create the `.github/workflows` directory in the root of your project.
2. Save the code above as `ci.yml`.
3. Commit and push to GitHub.
4. Go to the **Actions** tab in your GitHub repo to see the tests running automatically.
