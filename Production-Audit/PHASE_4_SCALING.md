# Phase 4: Scaling & Advanced Features

## Goal
Prepare the app to be deployed anywhere reliably using Docker, and set up automated security scans on Pull Requests using AI or standard security tools.

## 1. Dockerization

Create a `docker-compose.yml` in the root of the project to run the entire stack locally or on a VPS:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: elecshop
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: elecshop
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: 
      context: ./backend
    environment:
      - DATABASE_URL=postgres://elecshop:your_password@db:5432/elecshop
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - PORT=5000
    ports:
      - "5000:5000"
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

*(Note: You will also need to create standard `Dockerfile`s inside the `backend` and `frontend` folders respectively, utilizing standard Node.js alpine images and multi-stage builds for Next.js).*

## 2. Automated AI Code Review Setup

To automatically detect security issues, bad logic, or N+1 queries in future Pull Requests, you should integrate a review tool.

### Option A: Rabbit Code AI (If using a free tier)
1. Go to the GitHub Marketplace and search for **Rabbit Code AI**.
2. Click **Install it for free**.
3. Select your `Connect-shop` repository.
4. It requires read/write access to Pull Requests.
5. Once installed, every time you open a PR, Rabbit Code AI will analyze the diff and leave inline comments if it spots SQL injection risks, missing input validation, or bad variable names.

### Option B: GitHub CodeQL (Free natively)
If you prefer standard SAST (Static Application Security Testing):
1. Go to the **Security** tab of your GitHub repository.
2. Click **Code scanning alerts** -> **Set up CodeQL**.
3. GitHub will generate a `.github/workflows/codeql.yml` file.
4. Commit it. It will now scan your repository automatically every week and on every Pull Request for known security vulnerabilities like XSS, Path Traversal, and SQLi.
