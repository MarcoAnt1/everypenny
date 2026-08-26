# EveryPenny

A personal-finance tracker for managing accounts, transactions, budgets, and
savings goals — with automatic **bank-statement import** and **account sharing**
between users.

Track every account (checking, savings, credit card, cash, investment), import
transactions straight from your bank's CSV / PDF / XLSX statements, categorize
and tag spending, set budgets and goals, and share selected accounts with people
you connect with.

---

## Features

- **Accounts** — multiple account types with balances, currencies, and credit-card
  utilization (available credit + usage %).
- **Transactions** — income / expense / transfer, categories, tags, notes, and
  statuses (cleared / pending / reconciled).
- **Statement imports** — drop in a statement and parse transactions automatically.
  Built-in parsers: **Amex** (credit), **CIBC** (credit), **Neo** (credit), and
  **Wealthsimple** (checking), across CSV / PDF / XLSX.
- **Budgets & Goals** — monthly / quarterly / yearly budgets per category, plus
  savings goals with progress tracking.
- **Categories & Tags** — a set of system categories is seeded; users add their own.
- **Connections & sharing** — invite another user and share accounts, budgets,
  categories, or goals with EDITOR / VIEWER roles.
- **Auth & security** — JWT auth, bcrypt password hashing, Helmet, rate limiting,
  and invite-gated registration.
- **API docs** — interactive Swagger UI.

## Tech stack

| Layer      | Stack                                                             |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | Vue 3 · TypeScript · Vite · Tailwind CSS · Pinia · Vue Router     |
| Backend    | Node.js · Express 5 · TypeScript · Prisma ORM                     |
| Database   | PostgreSQL                                                        |
| Auth       | JWT · bcrypt                                                      |
| Tooling    | Vitest (tests) · Swagger / OpenAPI (docs)                        |

## Repository layout

```
everypenny/
├── client/          # Vue 3 + Vite frontend
│   └── src/
│       ├── api/         # Axios API clients
│       ├── pages/       # Dashboard, Accounts, Transactions, Budgets, ...
│       ├── stores/      # Pinia stores
│       └── router/
└── server/          # Express + Prisma backend
    ├── prisma/          # schema.prisma, migrations, seed
    └── src/
        ├── routes/      # auth, accounts, transactions, budgets, ...
        ├── parsers/     # bank statement parsers (Amex, CIBC, Neo, Wealthsimple)
        ├── services/    # authorization, balance, ...
        └── middleware/  # auth, error handling
```

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- **Docker** (used below to run PostgreSQL) — or an existing PostgreSQL instance

### 1. Clone and install

```bash
git clone <your-repo-url> everypenny
cd everypenny

# install both apps
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Start PostgreSQL

Spin up a local database with Docker:

```bash
docker run --name everypenny-db -e POSTGRES_USER=everypenny -e POSTGRES_PASSWORD=everypenny -e POSTGRES_DB=everypenny -p 5432:5432 -d postgres:16
```

> Already have PostgreSQL? Skip this and just point `DATABASE_URL` at your instance.

### 3. Configure environment variables

**Server** — copy the example and adjust if needed:

```bash
cd server
cp .env.example .env
```

`server/.env`:

| Variable       | Required | Description                                                        |
| -------------- | -------- | ------------------------------------------------------------------ |
| `JWT_SECRET`   | ✅       | Long random string used to sign auth tokens.                       |
| `DATABASE_URL` | ✅       | PostgreSQL connection string (matches the Docker command above).   |
| `INVITE_TOKEN` | ✅\*     | Registration is **invite-gated** — new users must send this token. |
| `PORT`         | —        | API port (defaults to `3000`).                                     |

\* Registration will reject every request without a matching `INVITE_TOKEN`, so
set it before creating your first user.

**Client** — copy its example:

```bash
cd ../client
cp .env.example .env
```

`client/.env`:

| Variable       | Description                                        |
| -------------- | -------------------------------------------------- |
| `VITE_API_URL` | Base URL of the API (e.g. `http://localhost:3000`). |

### 4. Set up the database schema

From `server/`:

```bash
npx prisma migrate dev      # apply migrations + generate the Prisma client
npx prisma db seed          # seed the default categories
```

### 5. Run the app

Open two terminals:

```bash
# Terminal 1 — API (http://localhost:3000)
cd server
npm run dev
```

```bash
# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

Then open **http://localhost:5173**.

- **API docs (Swagger):** http://localhost:3000/api-docs
- **Health check:** http://localhost:3000/health

---

## Doing a small test

### Option A — run the unit tests (fastest, no database needed)

The bank-statement parsers and the balance service have self-contained unit tests.
From `server/`:

```bash
npm test
```

You should see the parser + balance suites pass — a quick way to confirm the
backend is wired up correctly. Watch mode is available with `npm run test:watch`.

### Option B — end-to-end smoke test (API + database)

With the server running, verify the full auth flow from the command line.

1. **Health check:**

   ```bash
   curl http://localhost:3000/health
   # {"status":"EveryPenny API is running"}
   ```

2. **Register a user** (uses your `INVITE_TOKEN`):

   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"password123","inviteToken":"dev-invite-token"}'
   ```

   Returns a JWT `token` and the new user.

3. **Log in:**

   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

4. **Call an authenticated endpoint** (paste the token from above):

   ```bash
   curl http://localhost:3000/api/accounts \
     -H "Authorization: Bearer <token>"
   # []  (empty list for a fresh account)
   ```

Or just register/log in from the web UI at http://localhost:5173 and add your
first account.

---

## Useful scripts

**Server** (`cd server`):

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the API with hot reload (nodemon).      |
| `npm run build`     | Compile TypeScript to `dist/`.                |
| `npm start`         | Run the compiled server.                      |
| `npm test`          | Run the Vitest suite once.                    |
| `npm run test:watch`| Run tests in watch mode.                       |

**Client** (`cd client`):

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Start the Vite dev server.            |
| `npm run build`   | Type-check and build for production.  |
| `npm run preview` | Preview the production build locally. |
