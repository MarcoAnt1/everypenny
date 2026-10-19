# EveryPenny — Project Brief (AI context)

> **Purpose of this file:** a self-contained briefing so an AI assistant (e.g. a
> Claude.ai Project) can help with EveryPenny without access to the codebase.
> It covers what the app is, how it's built, the key domain rules, conventions,
> what's been done, and what's planned. Pair it with `README.md` (setup) and
> `ROADMAP.md` (full roadmap) as additional Project knowledge.
>
> _Last updated: 2026-10-05._

---

## 1. What EveryPenny is

EveryPenny is a **personal-finance tracker** for individuals and households. You
track accounts, income/expense/transfer transactions, budgets and savings goals,
**import transactions automatically from bank statements** (CSV / PDF / XLSX),
categorize and tag spending, and **share selected accounts/budgets/categories/
goals** with people you connect with (e.g. a partner).

- **Audience:** the developer (Marco) and their spouse, plus a planned closed beta.
- **Current status:** _beta candidate_ — feature-complete for everyday use.
  Backend type-checks and unit tests are green; registration is invite-gated.
  The most recent work was **Phase 19**, a frontend polish/responsiveness pass.

---

## 2. Tech stack & repository layout

| Layer     | Stack                                                          |
| --------- | -------------------------------------------------------------- |
| Frontend  | Vue 3 (`<script setup lang="ts">`) · Vite · Tailwind CSS v4 · Pinia · Vue Router |
| Backend   | Node.js · Express 5 · TypeScript · Prisma ORM                  |
| Database  | PostgreSQL                                                     |
| Auth      | JWT · bcrypt · invite-gated registration                      |
| Tooling   | Vitest · Swagger/OpenAPI · (no CI yet)                         |

```
everypenny/
├── client/                 # Vue 3 + Vite frontend
│   └── src/
│       ├── api/            # Axios API clients (client.ts = configured instance)
│       ├── components/     # Reusable UI (dropdowns, modals, toasts, skeleton…)
│       ├── layouts/        # AppLayout (sidebar + top bar)
│       ├── pages/          # Dashboard, Accounts, Transactions, Budgets, Goals,
│       │                   #   Categories, Tags, Connections, Login
│       ├── stores/         # Pinia stores (auth, toast)
│       ├── router/         # routes + auth guard
│       └── utils/          # format.ts (currency/date/type helpers), PeriodRange
└── server/                 # Express + Prisma backend
    ├── prisma/             # schema.prisma, migrations, seed (system categories)
    └── src/
        ├── routes/         # auth, accounts, transactions, budgets, goals,
        │                   #   categories, tags, connections
        ├── parsers/        # bank statement parsers (see §5)
        ├── services/       # authorization, balance, statementPeriod
        ├── middleware/     # auth (JWT), error handling
        └── lib/            # prisma client, publicUser select
```

---

## 3. Domain model & key rules

The data model lives in `server/prisma/schema.prisma`. Core entities:

- **User** — `publicUserSelect` is used wherever a user is nested in a response;
  it deliberately **excludes `passwordHash`** (must never leave the server).
- **Account** — `type` ∈ `checking | savings | credit_card | investment | cash`;
  fields include `ownerId`, `name`, `balance` (Decimal), `currency`, `creditLimit`,
  and **`color`** (hex accent, added Phase 19). Unique on `(ownerId, name)`.
- **AccountShare** — join between an account and a user it's shared with;
  `role` ∈ `EDITOR | VIEWER` (default EDITOR). Unique on `(accountId, userId)`.
- **Transaction** — `type` ∈ `income | expense | transfer`.
  - **Amount sign convention** lives in `services/balance.ts` (`signAmount`):
    income is positive, expense negative, etc. Account balances are **stored**
    on `Account.balance` and kept in sync by applying **deltas** when a
    transaction is created/updated/deleted (`deltaOps`, `mergeDeltas`).
  - **Transfers:**
    - _Internal_ (account → account): **two** linked rows sharing a
      `transferGroupId` (one per side).
    - _External_ (one-sided, money leaving/entering to an outside party): a
      single row with `externalParty` set and a `direction` (in/out).
    - Editing a transfer is **delete-and-recreate**, not in-place.
- **Category** — nested: a parent with optional subcategories. System categories
  are seeded; users add their own (`userId` set on custom ones). A shared
  `CategoryPicker` renders parents + `└` subcategories across the app.
- **Tag** + **TransactionTag** — tags are many-to-many via the `TransactionTag`
  join table, which has a **unique constraint on `(transactionId, tagId)`**.
  ⚠️ When updating a transaction's tags you must **replace** the set
  (`{ deleteMany: {}, create: [...] }`) and **de-duplicate** `tagIds` — a
  create-only write or a repeated id violates that unique constraint (this was a
  real bug; see §6).
- **Budget** — per-category, period ∈ `monthly | quarterly | yearly`; viewable by
  any chosen month/quarter/year (`PeriodSelector`).
- **Goal** — a savings goal with a target and progress.
- **Connection** — an invite/accept relationship between two users
  (`status` ACCEPTED/…); feature flags like `shareAllAccounts` drive what a
  connected user can see. Authorization helpers in `services/authorization.ts`
  (`getUserAccounts`, `userCanAccessTransaction`, `userCanEditTransactionInAccount`, …).

---

## 4. Frontend conventions

- **Components are `<script setup lang="ts">`**; state via **Pinia setup stores**.
- **Shared UI components** (prefer these over native controls):
  - `Dropdown.vue` (single select), `MultiSelect.vue` (checkbox multi),
    `CategoryPicker.vue` (nested category picker, optional "+ create" and
    "include uncategorized"), `PeriodSelector.vue` (month/quarter/year).
  - All use a rounded trigger button + absolute floating panel, `@click.stop` on
    the panel, and a document click-outside listener.
- **Toasts:** global `stores/toast.ts` + `<ToastContainer>` mounted once in
  `App.vue`. Use `toast.error(...)` / `toast.success(...)` at failure/success
  points instead of silent `console.error`.
- **Buttons:** shared classes in `client/src/assets/main.css` —
  `.btn-primary` (solid indigo), `.btn-secondary` (neutral outline),
  `.btn-danger` (red). Use these for every action button and modal.
- **Modals:** backdrop closes via `@mousedown.self` (not `@click.self`, which
  closes when a selection starts inside and the mouse-up lands on the backdrop);
  backdrops carry `p-4` so dialogs don't touch screen edges on phones.
- **Layout (`AppLayout.vue`):** sidebar + a slim `h-16` top bar aligned to the
  sidebar's brand row. On desktop the sidebar **collapses to an icon rail**
  (toggle via the logo or a chevron, persisted to `localStorage`); below `lg` it
  becomes an **off-canvas drawer** with a backdrop opened by a header hamburger.
- **Responsiveness:** works down to ~375px — headers stack, filter rows wrap,
  wide tables get an `overflow-x-auto` wrapper, grids collapse to 1–2 columns.
- **Polish primitives:** `LoadingSkeleton.vue` (pulsing placeholders) instead of
  "Loading…" text; `formatType()` for enum-ish labels (`credit_card` →
  "Credit Card"); global `tabular-nums`; card style is
  `bg-white rounded-xl border border-gray-100 shadow-sm`.
- **Auth/API:** `api/client.ts` is an Axios instance that attaches the JWT from
  `localStorage` and, on a `401`, clears auth and **hard-redirects to `/login`**.
  Router guard (`router/index.ts` `beforeEach`) gates non-`meta.public` routes on
  `authStore.isAuthenticated`.

---

## 5. Backend conventions — statement parsers

Parsers live under `server/src/parsers/banks/<bank>/<type>.ts` and are listed in
a **registry** keyed by `Bank` + `StatementType` enums.

- Base classes: `PdfParser`, `CsvParser`, `XlsxParser` (expose
  `parseText` / `parseRecords` / `parseMatrix` for tests). Period helpers:
  `resolvePeriod` / `resolveYear` from `parsers/base/statementPeriod`.
- Implemented: **Amex** (credit), **CIBC** (credit), **Neo** (credit + chequing),
  **Wealthsimple** (chequing + credit). TD/RBC/BMO/Scotiabank are stubbed.
- **Payments on credit statements are imported as income** (money into the card),
  not skipped — the user reclassifies in the import preview if needed.
- The import flow is a wizard (`ImportStatementModal.vue`) with a
  **review-before-save** step.

---

## 6. What's been done recently (Phase 18–19 highlights)

- **Statement imports:** added the **Neo chequing** PDF parser; changed all credit
  parsers to import **payments as income** (previously skipped); CIBC now parses
  its "Your payments" section.
- **Accounts:** added a per-account **color** (DB migration + picker shown as a
  card accent) and **grouping** — your accounts first, then each connected user's
  accounts under their name.
- **Global alerts:** toast store + `ToastContainer` wired across pages.
- **Import modal:** replaced the last native `<select>`s with the shared
  `Dropdown`/`CategoryPicker`.
- **Layout:** collapsible/hideable sidebar and full **responsive** pass
  (off-canvas drawer, table scroll, modal padding, stacking headers).
- **Design system:** shared button classes applied app-wide; aligned the sidebar
  brand row and top bar; removed a duplicated page title.
- **UI polish:** skeleton loaders, readable type casing, stronger secondary-text
  contrast, tabular figures, hairline card borders.
- **Bug fix:** updating a transaction's tags hit a `(transactionId, tagId)` unique
  constraint — fixed by **replacing** the tag set (`deleteMany` + `create`) and
  **de-duplicating** `tagIds` in every handler.

---

## 7. Dev & ops notes (gotchas)

- **Windows dev machine.** Node is **not on the shell PATH**; invoke it by full
  path: `"C:\Program Files\nodejs\node.exe"`.
- **Type-check / test (run from the app dir):**
  - Client: `node node_modules/vue-tsc/bin/vue-tsc.js -b`
  - Server: `node node_modules/typescript/bin/tsc --noEmit`
  - Tests: `npm test` (server) or `node node_modules/vitest/vitest.mjs run`
- **Running the backend:** `npm run dev` uses **nodemon** (auto-reloads on `src`
  changes). If it's launched via the **VS Code debugger** (`ts-node`,
  `--inspect`), there's **no auto-reload** — restart the debug session after
  server code changes or the running server stays on old code.
- **Prisma:** migrations via `npx prisma migrate dev`. On Windows, `prisma
  generate` can throw a benign `EPERM` renaming the query-engine DLL while the
  server holds it — the datamodel still updates; a running server needs a restart
  to pick up schema changes.
- **Database:** PostgreSQL on `localhost:5432` (user/db `everypenny`).
  Registration requires a matching `INVITE_TOKEN` (see `server/.env`).

---

## 8. Roadmap (future features)

Full detail is in `ROADMAP.md`. Condensed:

**Beta blockers (do before opening the beta)**
- Account recovery ("forgot password").
- Multi-currency correctness (totals currently sum across currencies without
  conversion).
- Data safety: delete confirmations showing what's removed, DB backup/restore,
  consider soft delete (`deletedAt`).
- Error tracking (e.g. Sentry) on client + server.
- A few API smoke/integration tests.
- Beta onboarding note for invitees.

**v1.0 — post-beta polish**
- Quality: frontend component tests, authorization/sharing integration tests, CI
  (type-check + tests per PR).
- Security: email verification, general API rate limiting, token/session review,
  optional 2FA.
- Product: recurring/scheduled transactions + "upcoming" view; budget/goal
  overspend notifications; reports & export (CSV/PDF); auto-categorization rules
  on import; proper transfer editing.
- UX: further responsive/PWA polish, empty-state/first-run guidance,
  accessibility pass.

**Later (exploratory)**
- More bank parsers (TD, RBC, BMO, Scotiabank); receipt/attachment uploads;
  multi-currency accounts with live FX; derived account balances; insights &
  forecasting; bank aggregation (e.g. Plaid); richer household roles.

**Near-term UI idea discussed:** swap emoji icons (nav, account types, dashboard
tiles) for a consistent SVG icon set (Lucide) for a more polished look; optional
dark mode.

> _Ideas I want to try (fill in):_
> - …

---

## 9. How to use this in a Claude.ai Project

1. Create a new Project named **EveryPenny**.
2. Add as Project knowledge: **this file**, plus `README.md` and `ROADMAP.md`.
3. Paste something like this into the Project's custom instructions:

   > This project is **EveryPenny**, a Vue 3 + Express/Prisma/PostgreSQL personal-
   > finance app (see the project brief). When answering, respect the existing
   > conventions: reuse the shared UI components and `.btn-*` classes, use the
   > toast store for user-facing errors, keep the amount-sign/transfer rules in
   > mind, and remember tags must be replaced-and-deduped on update. Prefer
   > concrete, minimal diffs. Ask before large refactors. Assume a Windows dev
   > machine where Node isn't on PATH.
