import { TxType } from "@prisma/client";

// Matching rules for statement imports, kept pure (no DB) so they're testable.
//
// Two problems they solve when backfilling many accounts:
//  1. Duplicates — re-importing a statement, overlapping statements, or a row
//     that already exists in this account as one leg of a transfer (e.g. the
//     card's "PAYMENT - THANK YOU" after chequing recorded the payment as a
//     transfer to the card).
//  2. Own-account transfers — the other side of a payment already sits in
//     another account as a plain income/expense row; it should be linked into a
//     transfer instead of counted twice.

export const DUPLICATE_WINDOW_DAYS = 1;
// Card payments / transfers can post a few days apart between banks (weekends).
export const TRANSFER_WINDOW_DAYS = 4;
const EPSILON = 0.005;

export type Direction = "in" | "out";

export type ExistingTx = {
  id: string;
  accountId: string;
  accountName?: string;
  date: Date;
  amount: number; // signed, as stored (positive = money into the account)
  description: string;
  type: TxType;
  transferGroupId: string | null;
};

export type ImportRow = {
  date: string | null;
  amount: number; // positive, as parsed
  direction: Direction;
};

export type RowMatch =
  | {
      kind: "duplicate";
      transactionId: string;
      date: string;
      description: string;
    }
  | {
      kind: "transfer";
      transactionId: string;
      accountId: string;
      accountName: string;
      date: string;
      description: string;
    };

export const signedAmount = (amount: number, direction: Direction) =>
  direction === "in" ? Math.abs(amount) : -Math.abs(amount);

// Whole calendar days apart (rounding absorbs timezone offsets in stored dates).
export const dayDiff = (a: Date, b: Date) =>
  Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000);

// Same money already recorded in this account: same signed amount, within a
// day — or within the transfer window when the existing row is a transfer leg.
export function isDuplicate(e: ExistingTx, rowDate: Date, signed: number) {
  if (Math.abs(e.amount - signed) >= EPSILON) return false;
  const days = dayDiff(e.date, rowDate);
  return (
    days <= DUPLICATE_WINDOW_DAYS ||
    (!!e.transferGroupId && days <= TRANSFER_WINDOW_DAYS)
  );
}

// The other side of an own-account transfer: a plain (not yet linked)
// income/expense with the opposite amount, close in date.
export function isCounterpart(e: ExistingTx, rowDate: Date, signed: number) {
  return (
    !e.transferGroupId &&
    (e.type === TxType.income || e.type === TxType.expense) &&
    Math.abs(e.amount + signed) < EPSILON &&
    dayDiff(e.date, rowDate) <= TRANSFER_WINDOW_DAYS
  );
}

export function closestByDate(
  rowDate: Date,
  candidates: ExistingTx[],
): ExistingTx | null {
  return candidates.reduce<ExistingTx | null>(
    (best, c) =>
      !best || dayDiff(c.date, rowDate) < dayDiff(best.date, rowDate) ? c : best,
    null,
  );
}

// Annotate each import row with a match, if any. Every existing transaction is
// used at most once, and duplicates take priority over transfer suggestions.
export function matchImportRows(
  rows: ImportRow[],
  accountId: string,
  existing: ExistingTx[],
): (RowMatch | null)[] {
  const used = new Set<string>();
  const matches: (RowMatch | null)[] = rows.map(() => null);

  rows.forEach((row, i) => {
    if (!row.date) return;
    const date = new Date(row.date);
    const signed = signedAmount(row.amount, row.direction);
    const hit = closestByDate(
      date,
      existing.filter(
        (e) =>
          e.accountId === accountId &&
          !used.has(e.id) &&
          isDuplicate(e, date, signed),
      ),
    );
    if (!hit) return;
    used.add(hit.id);
    matches[i] = {
      kind: "duplicate",
      transactionId: hit.id,
      date: hit.date.toISOString(),
      description: hit.description,
    };
  });

  rows.forEach((row, i) => {
    if (!row.date || matches[i]) return;
    const date = new Date(row.date);
    const signed = signedAmount(row.amount, row.direction);
    const hit = closestByDate(
      date,
      existing.filter(
        (e) =>
          e.accountId !== accountId &&
          !used.has(e.id) &&
          isCounterpart(e, date, signed),
      ),
    );
    if (!hit) return;
    used.add(hit.id);
    matches[i] = {
      kind: "transfer",
      transactionId: hit.id,
      accountId: hit.accountId,
      accountName: hit.accountName ?? "",
      date: hit.date.toISOString(),
      description: hit.description,
    };
  });

  return matches;
}
