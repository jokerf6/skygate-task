# Middleware Architecture

This document explains the middleware and guard layer used in the application, including XSS protection, rate limiting, and permission enforcement.

## Global Middleware

### `XssMiddleware`

**File:** `src/globals/middlewares/xss.middleware.ts`

What it does:
- recursively sanitizes `req.body`, `req.query`, and `req.params`
- removes dangerous HTML/JS from user-provided input
- protects the app from reflected and stored XSS payloads before validation and business logic run

Why it matters:
- early sanitization reduces trust in user input
- it is applied globally, so every request receives the same protection

### `RateLimitMiddleware`

**File:** `src/globals/middlewares/rate-limit.middleware.ts`

What it does:
- tracks request volume per route and IP address
- uses Redis to count requests in a fixed time window
- when the limit is exceeded, issues a `429 Too Many Requests`
- blocks abusive clients for a configurable duration

Redis keys used:
- `rate-limit:<route>:<ip>`
- `rate-limit-blocked:<route>:<ip>`

Why it matters:
- protects the system from general abuse and brute-force traffic spikes
- avoids exhausting CPU or Redis-backed queue resources
- excludes media routes so file streaming is not rate limited in the same way

## Endpoint-Specific Guards

### `OrderRateLimitGuard`

**File:** `src/_modules/order/guards/order-rate-limit.guard.ts`

What it does:
- limits `POST /api/orders` to 5 requests per minute per user or IP
- stores counts in Redis with a short TTL
- throws `429` when traffic exceeds the per-order threshold

Why it matters:
- prevents automated or accidental duplicate order creation
- pairs with idempotency keys to harden the order endpoint

## Authentication and Permissions

### `Auth` decorator

**File:** `src/_modules/authentication/decorators/auth.decorator.ts`

What it does:
- applies `AuthGuard('ACCESS')` for standard authenticated routes
- applies `OptionalAuthGuard` for visitor-enabled routes
- attaches permission metadata when a route needs scoped authorization
- adds Swagger bearer auth metadata for documentation

### `PermissionAndTypeGuard`

**File:** `src/_modules/authentication/guards/mix-guard.ts`

What it does:
- reads required permission metadata from the route
- reads the current user and their permissions
- validates whether `user.permissions` includes the required `prefix_method`
- allows public visitor access when `visitor=true`

Why it matters:
- gives a clean way to enforce both session type and permission rules
- avoids hard-coded permission checks inside controllers
- keeps authorization declarative and reusable across modules

### `RequiredPermissions`

**File:** `src/_modules/authentication/decorators/permission.decorator.ts`

What it does:
- stores required permission keys using metadata
- enables the guard layer to evaluate authorization using normalized permission strings

## Permission Validation Helper

**File:** `src/globals/helpers/validatePermissions.helper.ts`

What it does:
- normalizes permission checks to lowercase
- reads permission prefixes and methods from user permission records
- compares required and granted permissions using a stable pattern

Example:

- required: `product_get`
- granted: `product_get`, `order_post`

Why it matters:
- prevents case-sensitivity bugs
- centralizes permission matching logic
- supports role-based permission configuration cleanly

## How Middleware Supports the Task

This layer ensures:
- requests are cleaned before they reach business logic
- the order creation endpoint is protected from abuse
- authenticated routes remain secure and expressive
- permissions are enforced consistently across all modules
- user experience remains consistent while the backend evolves
