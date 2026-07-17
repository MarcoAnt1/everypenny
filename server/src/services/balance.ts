import { TxType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../lib/prisma";

// Sign a positive user-facing amount according to transaction type.
// Positive = money enters `accountId`. Negative = money leaves.
export function signAmount(
  type: TxType,
  positivieAmount: Decimal | number | string,
): Decimal {
  const amt = new Decimal(positivieAmount);
  return type === TxType.expense ? amt.negated() : amt;
}

export type Delta = { accountId: string; delta: Decimal };

// Sum deltas per account so each account gets a single balance update instead of
// one per transaction. Callers that build a delta per row (e.g. statement import)
// should run the list through this before handing it to `deltaOps`.
export function mergeDeltas(deltas: Delta[]): Delta[] {
  const totals = new Map<string, Decimal>();
  for (const d of deltas) {
    const running = totals.get(d.accountId) ?? new Decimal(0);
    totals.set(d.accountId, running.plus(d.delta));
  }
  return [...totals].map(([accountId, delta]) => ({ accountId, delta }));
}

// One or more balance updates as $transaction operations.
export function deltaOps(deltas: Delta[]) {
  return deltas
    .filter((d) => !d.delta.isZero())
    .map((d) =>
      prisma.account.update({
        where: { id: d.accountId },
        data: { balance: { increment: d.delta } },
      }),
    );
}
