# Connect-Shop / ElecSHOP

Connect-Shop / ElecSHOP is a full-stack ecommerce management system for small businesses. It includes a customer storefront, backend API, PostgreSQL database, authentication, cart, wishlist, cash-on-delivery order flow, and an admin dashboard for managing products, categories, orders, and homepage content.

This project is intended as a practical small-business ecommerce system, not a marketplace or enterprise ERP platform.

## Tech Stack

- Frontend: Next.js + TypeScript
- Backend: Express.js + TypeScript
- Database: PostgreSQL
- Admin dashboard
- Authentication and protected admin routes
- Cart, wishlist, and orders
- Homepage CMS
- Image handling
- Redis-backed rate limiting and optional public read caching

## Main Features

- Customer storefront
- Product search, filtering, sorting, and pagination
- Product detail pages
- Cart and wishlist
- Cash on delivery checkout
- Required customer phone and delivery address fields
- Admin product/category/order management
- Admin order detail view and status updates
- Homepage content control
- Contact, About, FAQ, Privacy Policy, Return Policy, and Terms pages
- WhatsApp support links
- SEO/mobile polish
- Deployment, backup, and production checklist documentation

## Project Structure

```text
frontend/   Next.js storefront and admin UI
backend/    Express API, auth, database, migrations, and services
docs/       Client/admin handover documentation
project-docs/ Project audit, setup, deployment, and production checklists
```

## Local Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Create backend env file:

```bash
cp .env.example .env
```

Set local PostgreSQL values in `backend/.env`, then run migrations:

```bash
npm run db:migrate
```

Start the backend:

```bash
npm run dev
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

Create frontend env file:

```bash
cp .env.example .env.local
```

Start the frontend:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

Do not commit real `.env` files or secrets.

## Deployment Summary

Recommended deployment stack:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL
- Images: ImageKit recommended for production image storage/CDN
- Domain: Namecheap
- Redis: optional Render Redis-compatible Key Value or Upstash Redis

See [Deployment Guide](project-docs/DEPLOYMENT_GUIDE.md), [Backup and Recovery](project-docs/BACKUP_AND_RECOVERY.md), and [Production Checklist](project-docs/PRODUCTION_CHECKLIST.md).

## Documentation

- [Admin Guide](docs/ADMIN_GUIDE.md)
- [Client Handover Checklist](docs/CLIENT_HANDOVER_CHECKLIST.md)
- [Maintenance and Support](docs/MAINTENANCE_AND_SUPPORT.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
- [Launch Checklist](docs/LAUNCH_CHECKLIST.md)
- [Deployment Guide](project-docs/DEPLOYMENT_GUIDE.md)
- [Backup and Recovery](project-docs/BACKUP_AND_RECOVERY.md)
- [Production Checklist](project-docs/PRODUCTION_CHECKLIST.md)
- [Redis Cache Policy](project-docs/REDIS_CACHE_POLICY.md)
- [Sellable Version Checklist](project-docs/SELLABLE_VERSION_CHECKLIST.md)
- [ImageKit Setup](project-docs/IMAGEKIT_SETUP.md)
- [Technical Audit and Scalability Review](project-docs/PROJECT_TECHNICAL_AUDIT_AND_SCALABILITY_REVIEW.md)

## Notes For Client Delivery

Before selling or handing this system to a real business:

- Replace placeholder business contact information.
- Remove or replace demo data.
- Confirm product/category/order/admin flows end to end.
- Confirm image storage is production-safe.
- Configure backups and test restore.
- Agree on maintenance, support scope, and hosting responsibility.
