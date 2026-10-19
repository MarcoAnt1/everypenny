# EveryPenny — Roadmap

A personal-finance tracker for managing accounts, transactions, budgets, and
goals — with automatic bank-statement import and household sharing.

This roadmap captures where the app is today and what's planned. It's a living
document; reorder freely as priorities change.

**Status legend:** ✅ done · 🚧 in progress · 🔜 next · 💡 exploring

---

## Where we are today

Active development is finishing **Phase 18**. The app is a **beta candidate**:
feature-complete for everyday use, backend type-checks and unit tests are green,
and registration is invite-gated (ideal for a closed beta).

### Shipped ✅
- **Accounts** — checking / savings / credit card / cash / investment, with
  credit-card utilization.
- **Transactions** — income / expense / transfer, categories, tags, notes,
  statuses; persistent filters, text/amount search, and per-person filtering.
- **Statement imports** — Amex, CIBC, Neo (credit) and Wealthsimple
  (chequing + credit, incl. the activities export) across CSV / PDF / XLSX,
  with a review-before-save step.
- **Budgets** — monthly / quarterly / yearly, viewable by any month/quarter/year.
- **Goals** — savings goals with progress tracking.
- **Categories & tags** — nested categories (parent + subcategories), a shared
  category picker across the app, seeded system categories.
- **Connections & sharing** — invite another user (e.g. a partner) and share
  accounts / budgets / categories / goals; shared accounts are clearly marked.
- **Dashboard** — period + person controls, spending-by-category, income-vs-
  expenses trend, balances by account type, biggest expenses, and insight tiles.
- **Auth & security** — JWT, bcrypt, Helmet, auth rate-limiting, invite-only
  registration; `passwordHash` no longer leaves the server.

---

## Beta blockers 🔜  (do before opening the beta)

Small but important gaps that would bite real users trusting the app with real
financial data.

- [ ] **Account recovery** — a "forgot password" flow (or, at minimum, a
      documented manual-reset procedure for the closed beta).
- [ ] **Multi-currency correctness** — "Total Net Worth" and other totals sum
      balances across currencies without conversion. Either constrain beta users
      to a single currency, or convert before summing (and label the base
      currency).
- [ ] **Data safety** — deletes are hard (an account deletion cascades its
      transactions with no undo). Add a delete confirmation summary showing what
      will be removed, a documented DB backup/restore routine, and consider soft
      delete (`deletedAt`) for accounts/transactions.
- [ ] **Error visibility** — wire up error tracking (e.g. Sentry) on client and
      server so beta issues can be triaged; replace `console.error` swallowing
      with reported errors.
- [ ] **Smoke tests** — a handful of API integration tests (register/login,
      account + transaction CRUD, one import round-trip) to catch regressions
      while iterating.
- [ ] **Beta onboarding** — a short "getting started" note for invitees
      (create account with invite token → add an account → import a statement).

---

## v1.0 — post-beta polish

Hardening and quality once the beta is running.

### Quality & testing
- [ ] Frontend component tests for the critical flows (transaction create/edit,
      import wizard, filters).
- [ ] API integration tests covering authorization/sharing edge cases.
- [ ] CI pipeline: type-check + tests on every PR.

### Security & privacy
- [ ] Email verification on registration.
- [ ] General API rate limiting (not just auth).
- [ ] Session/token handling review (expiry, refresh, logout-everywhere).
- [ ] Optional 2FA.

### Product
- [ ] Recurring / scheduled transactions and an "upcoming" view.
- [ ] Budget & goal notifications (e.g. overspend alerts).
- [ ] Reports & export (CSV / PDF; monthly summary).
- [ ] Auto-categorization rules applied during import.
- [ ] Transfer editing (currently delete-and-recreate).

### UX
- [ ] Mobile / responsive polish (and consider a PWA install).
- [ ] Empty-state and first-run guidance.
- [ ] Accessibility pass (keyboard nav, focus states, contrast).

---

## Later 💡  (exploratory)

- More bank/statement parsers (TD, RBC, BMO, Scotiabank are stubbed but not
  implemented).
- Receipt/attachment uploads on transactions.
- Multi-currency accounts with live FX and a chosen base currency.
- Derived account balances (compute from transactions instead of a stored
  `balance`) to eliminate drift.
- Savings/spending insights and forecasting.
- Bank connection via aggregation APIs (e.g. Plaid) instead of file imports.
- Shared-household roles beyond EDITOR / VIEWER.

---

## Known limitations (today)
- Totals mix currencies without conversion (see beta blockers).
- Deletes are permanent; no trash/undo.
- Only credit + chequing statement types are implemented; savings/investment
  parsing is not.
- Editing a transfer isn't supported — delete and recreate instead.
- Automated coverage is backend-only (parser + balance unit tests); no
  frontend or API-integration tests yet.
