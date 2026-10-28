# Transaction Ledger API

A RESTful backend API for a transaction ledger system supporting account creation, credit/debit transactions with balance consistency, idempotency, and paginated transaction history.

## Features

- **Account Management** — Create accounts with system-generated IDs and zero initial balance
- **Transaction Processing** — Credit and debit with real-time balance updates
- **Idempotency** — Duplicate `reference_id` per account is safely rejected without side effects
- **Balance Consistency** — Atomic updates using PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`)
- **Transaction Immutability** — Transactions are append-only; PUT/PATCH/DELETE return `405 Method Not Allowed`
- **Paginated History** — Filter by type, paginate with metadata, sorted latest-first
- **Defense in Depth** — Validation at middleware, service, and database constraint levels

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript 5.6 |
| Database | PostgreSQL 16 |
| Testing | Jest + Supertest |
| Containerization | Docker Compose |

## Project Structure

```
src/
├── config/          # Database connection and migrations
├── controllers/     # HTTP request/response handling
├── services/        # Business logic (balance, idempotency)
├── repositories/    # Database queries (single responsibility)
├── routes/          # Endpoint definitions
├── middleware/      # Error handling and validation
├── types/           # TypeScript interfaces
├── utils/           # Pagination helpers
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

## Quick Start

### Prerequisites

- Node.js (v18+)
- Docker Desktop

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

### 3. Configure Environment

```bash
cp .env.example .env
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Health Check

```
GET /health
```

### Create Account

```
POST /api/accounts
Content-Type: application/json

{
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "balance": "0.00",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "message": "Account created successfully"
}
```

### Get Balance

```
GET /api/accounts/:id/balance
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "account_id": "uuid",
    "balance": 150
  }
}
```

### Add Transaction

```
POST /api/transactions
Content-Type: application/json

{
  "account_id": "uuid",
  "type": "credit",
  "amount": 100,
  "description": "Salary",
  "reference_id": "pay-2025-001"
}
```

- **201** — Transaction created
- **200** — Duplicate reference_id (idempotent response, no balance change)
- **400** — Insufficient balance or validation error
- **404** — Account not found

### Get Transaction History

```
GET /api/transactions/account/:accountId?type=credit&page=1&limit=10
```

Query parameters:
- `type` (optional): `credit` or `debit`
- `page` (optional, default 1): page number
- `limit` (optional, default 10, max 100): records per page

**Response (200):**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 25,
    "total_pages": 3
  }
}
```

### Immutability

Transactions cannot be modified or deleted:

```
PUT    /api/transactions/:id  → 405 Method Not Allowed
PATCH  /api/transactions/:id  → 405 Method Not Allowed
DELETE /api/transactions/:id  → 405 Method Not Allowed
```

## Running Tests

```bash
npm test
```

The test suite includes 18 integration tests covering:
- Account creation and validation
- Credit/debit balance updates
- Insufficient funds rejection
- Idempotency (duplicate reference_id)
- Cross-account reference_id independence
- Balance queries and 404 handling
- Transaction history filtering, sorting, pagination
- Immutability enforcement

## Design Decisions

### Why `NUMERIC(15,2)` instead of `FLOAT`?

Floating-point arithmetic causes precision errors (`0.1 + 0.2 ≠ 0.3`). `NUMERIC` provides exact decimal representation critical for financial data.

### Why `SELECT ... FOR UPDATE`?

Prevents race conditions when concurrent transactions attempt to modify the same account balance. The row is locked until the database transaction commits or rolls back.

### Why DB-level `UNIQUE(account_id, reference_id)`?

Code-level duplicate checks can be bypassed by concurrent requests. The database constraint is the final safety net ensuring idempotency even under race conditions.

### Why no ORM?

For a focused assignment, raw SQL with parameterized queries provides full control, transparency, and demonstrates understanding of the underlying database operations without abstraction overhead.

### Layered Architecture

- **Routes** — Define endpoints, apply validation middleware
- **Controllers** — Parse requests, call services, format responses
- **Services** — Business logic (balance checks, idempotency)
- **Repositories** — Database queries (single responsibility)

This separation enables testability, maintainability, and clear ownership of concerns.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run migrate` | Run database migrations |
| `npm test` | Run test suite |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `ledger_db` | Database name |
| `DB_USER` | `ledger_user` | Database user |
| `DB_PASSWORD` | `ledger_password` | Database password |