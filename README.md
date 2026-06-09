# Skygate Task

## Overview

This repository implements a professional Order & Inventory Management service using NestJS, TypeScript, Prisma, Redis, Bull, and MySQL/MySQL-compatible databases.

The design prioritizes:
- clean layered architecture
- transactional integrity for order creation
- asynchronous background processing
- concurrency-safe stock updates
- JWT-based access + refresh authentication
- centralized validation and standardized error handling
- DRY, secure, and extensible code organization

## What is Included

- `POST /api/orders`: transactional order creation with stock lock and idempotency
- `GET /api/orders`: paginated order listing with status, date range, and total filtering
- `PUT /api/products/:id`: product price/stock update
- `DELETE /api/products/:id`: soft delete with unique-key rotation
- `POST /api/auth/login`: access + refresh token issuance
- `POST /api/auth/refresh`: refresh access tokens securely
- background email queue processing using Bull + Redis
- rate limiting and per-endpoint guard protection
- local upload handling that mirrors S3-compatible path structure

## Architecture Highlights

### Clean Architecture

- `src/_modules`: domain modules grouped by feature (`order`, `product`, `authentication`, `media`, etc.)
- `src/globals`: cross-cutting middleware, services, interceptors, helpers, and common configuration
- `prisma`: schema, middleware, and seed logic kept out of controller/business logic
- `docs`: design documentation for Prisma, validators, uploads, and middleware

### Key Design Principles

- `PrismaService` registers middleware centrally so database behavior is consistent across the app
- Controllers are thin; business logic belongs to services
- Validation is declared in DTOs and enforced globally by NestJS pipes
- Error responses are uniform and include `success`, `message`, and structured `error` details
- Upload handling is local today, but the API contract is compatible with future S3 replacement

## Documentation Files

- `docs/PRISMA.md` — Prisma middleware, soft delete, unique key handling, and transaction support
- `docs/VALIDATORS.md` — class-validator decorators, request-level validation rules, and database validation integration
- `docs/UPLOADS.md` — upload service behavior, local storage structure, and S3-compatible contract
- `docs/MIDDLEWARES.md` — XSS sanitization, rate limiting, auth guards, and permission enforcement

## Production API Documentation

- Swagger production: http://skygate.fahd-portfolio.online/api/docs
- Postman production JSON: http://skygate.fahd-portfolio.online/api/docs-json
- Customer docs: http://skygate.fahd-portfolio.online/api/docs/customer
- Admin docs: http://skygate.fahd-portfolio.online/api/docs/admin

## Setup

1. Copy environment file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start local dependencies with Docker Compose:

```bash
docker-compose up -d
```

4. Generate Prisma client and migrate:

```bash
npm run db:generate
# then run your preferred migration or db push flow
```

5. Seed initial data:

```bash
npm run db:seed
```

6. Start the app in development mode:

```bash
npm run start:dev
```

## Docker Compose

This project ships with `docker-compose.yaml` and includes:
- `app` running the NestJS service
- `db` running MySQL 8.0
- `redis` for Bull queue and rate limiting
- `opensearch` for search/indexing support

The app service is already configured to read `.env` and use `REDIS_HOST`, `REDIS_PORT`, and `DATABASE_URL`.

## How Race Conditions are Prevented

- `OrderService.create()` uses a Redis-backed idempotency lock per `idempotencyKey`
- product rows are locked with `FOR UPDATE` inside a Prisma transaction to prevent concurrent stock deductions
- order items are sorted by `productId` before locking to preserve a stable lock order and reduce deadlocks
- soft delete is handled in Prisma middleware so deleted products never reappear in normal queries

## Background Jobs

- `Bull` is configured via `src/app/_modules/worker/worker.module.ts`
- `OrderService` adds a `SEND_EMAIL` job after order creation
- jobs are configured with exponential backoff and retry attempts
- the queue consumer processes email jobs independently from the request path

## API Notes

- All API responses follow a standardized JSON error format
- DTO validation rejects unknown fields and enforces strict type and shape rules
- Soft-deleted products are excluded from normal queries but remain available for audit and order history
- Upload routes use the same path conventions expected by S3 clients, so frontend integration is future-proof

## Testing

Run unit and integration tests with:

```bash
npm test
```

For coverage:

```bash
npm run test:cov
```

## Contact

Project owner: `Fahd Hakem`

---

This repository is designed to be DRY, secure, and ready to scale with additional services, queues, and storage backends.
