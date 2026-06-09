# Prisma Architecture

This document explains every design decision made around the Prisma layer: middleware pipeline, schema conventions, and why each piece exists.

It is the dedicated reference for how the project handles:
- soft delete behavior and unique key rotation
- transaction-safe order processing
- database-level existence checks and query scoping
- audit logging and snapshot consistency

---

## Middleware Pipeline

All middlewares are registered in `PrismaService.onModuleInit()` and run in this order on every database operation:

```
Request
  ↓
skuMiddleware          – auto-generate SKU for Products
  ↓
orderSnapshotMiddleware – capture product snapshot + invoice number
  ↓
AuditMiddleware        – write audit log for mutations
  ↓
softDeleteMiddleware   – intercept delete → update(deletedAt)
  ↓
sortMiddleware         – inject default createdAt DESC ordering
  ↓
ExistMiddleware        – guard update/delete against ghost records
  ↓
Database
```

Each middleware is a pure function that receives `(params, next)` and delegates to `next(params)` — no side effects escape the pipeline.

---

## 1. `softDeleteMiddleware`

**File:** `prisma/middleware/prisma.softdelete.middleware.ts`

### What it does

- Intercepts every `delete` action on any model that has a `deletedAt` field.
- **Converts** the operation to an `update` that sets `deletedAt: new Date()` — the row is never physically removed.
- **Rotates unique fields** on the deleted record so the same value can be reused later:

```ts
data[field.name] = `deleted_${value}_${record.id}`;
// e.g. sku: "PROD-ABC123" → "deleted_PROD-ABC123_<uuid>"
```

This solves the classic "unique constraint blocks re-creation after soft delete" problem without any extra application logic.

- Intercepts `findMany / count / findFirst / findUnique` and automatically injects `{ deletedAt: null }` into the `where` clause so deleted records are invisible to all queries.
- Accepts a special escape hatch `__includeDeleted: true` in `args` if you explicitly need to see soft-deleted records.
- Auto-omits all `*At` timestamp columns from `findMany` results unless a manual `select` is provided.

### Why this approach

Keeping deletes in middleware means **zero application code** needs to know about `deletedAt`. Every service, every query, every join is automatically scoped to live records.

---

## 2. `skuMiddleware`

**File:** `prisma/middleware/prisma.sku.middleware.ts`

### What it does

Intercepts `Product.create` and `Product.createMany`. If the incoming `data` has no `sku` (or an empty string), it generates a unique one:

```
PROD-XXXXXX   (6 random base-36 uppercase chars)
```

Generation loops until a collision-free SKU is confirmed via a `findUnique` check, making it safe under any concurrency level.

### Why this approach

- Callers never have to produce or validate SKUs themselves.
- SKUs follow a consistent format across the entire dataset.
- The uniqueness guarantee is enforced at the DB query level, not just in application memory.

---

## 3. `orderSnapshotMiddleware`

**File:** `prisma/middleware/prisma.order.snapshot.middleware.ts`

### What it does

**Invoice number generation** — on every `Order.create`, if no `invoiceNumber` is provided, it injects:

```
INV-YYYYMMDD-XXXXXXXX
```

where the suffix is the first 8 chars of a UUID, producing human-readable, sortable invoice identifiers.

**Product snapshot** — on every `OrderItem.create` / `createMany`, it fetches the product by `productId` (or `sku`) and writes a full `productSnapshot` JSON:

```json
{
  "id": "...",
  "sku": "PROD-ABC123",
  "name": "...",
  "description": {...},
  "image": "...",
  "price": 99.99
}
```

### Why snapshots matter

Product prices and names change over time. Without a snapshot, a historical order would show the *current* price instead of the price at purchase. The snapshot is immutable once written, guaranteeing accurate financial records regardless of future catalog changes.

---

## 4. `AuditMiddleware`

**File:** `prisma/middleware/prisma.audit.middleware.ts`

Intercepts all mutating operations (`create`, `update`, `delete`, `deleteMany`, `updateMany`, `upsert`) and writes an `AuditLog` record containing:

- `model` — which Prisma model was affected
- `action` — the operation type
- `userId` — extracted from the CLS (Continuation-Local Storage) context, so no parameter threading is needed
- `before` / `after` — state snapshots for updates

Audit logs are append-only and never soft-deleted, providing a complete, tamper-evident history.

---

## 5. `softDeleteMiddleware` — unique key rotation detail

When a record with unique fields is soft-deleted, every `String` unique field is renamed:

```
original:  sku = "PROD-ABC123"
after del: sku = "deleted_PROD-ABC123_<uuid>"
```

This pattern means:
1. A new product with SKU `PROD-ABC123` can be created immediately.
2. The deleted record is still identifiable and auditable.
3. No extra migration or nullable-unique tricks are needed.

Non-string unique fields (e.g., integers, UUIDs) are left unchanged since they are typically system-generated and not reused.

---

## 6. `sortMiddleware`

**File:** `prisma/middleware/prisma.sort.middleware.ts`

Injects `{ createdAt: 'desc' }` as a default `orderBy` on every `findMany` for models that have a `createdAt` field. If the caller already provides a `createdAt` order, it is respected unchanged. This ensures consistent pagination without requiring every query to repeat the same boilerplate.

---

## 7. `ExistMiddleware`

**File:** `prisma/middleware/prisma.exist.middleware.ts`

Before executing any `update` or `delete`, it fetches the target record with `findUnique`. If the record does not exist or has a non-null `deletedAt`, it throws:

```
NotFoundException: *<field>* 0EXIST0
```

The token format (`0EXIST0`) is parsed by `ResponseService` using a regex that extracts the error key even when nested inside array index paths (e.g., `items.0.0EXIST0`), ensuring the final API error message is human-readable and properly translated.

---

## Schema Conventions

| Convention | Example | Purpose |
|---|---|---|
| `deletedAt DateTime?` | All major models | Soft delete gate |
| `@@index([deletedAt])` | All models | Filter performance |
| `@@index([status, createdAt])` | Orders | List + pagination |
| `@@index([userId, createdAt])` | Orders | Per-user listing |
| `@@index([sku])` | Products | Lookup performance |
| `@unique` on `idempotencyKey` | Order | Dedup at DB level |

---

## Raw SQL Usage

`OrderService.lockAndDeductStock` uses `$queryRaw` for pessimistic locking:

```sql
SELECT * FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE
```

`FOR UPDATE` acquires a row-level exclusive lock for the duration of the transaction, preventing any concurrent transaction from reading or modifying the same row until the first commits or rolls back. Items are sorted by `productId` before locking to enforce a consistent lock-acquisition order across all concurrent transactions, eliminating deadlocks.
