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
