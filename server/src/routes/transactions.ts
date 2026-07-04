import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getUserAccounts,
  userCanAccessTransaction,
  userCanEditTransactionInAccount,
} from "../helper/authorization";
import { Decimal } from "@prisma/client/runtime/library";
import { AccountType, TxType } from "@prisma/client";

const router = Router();

type TxSnapshot = {
  type: TxType;
  amount: Decimal | number | string;
  accountId: string;
  accountType: AccountType;
  toAccountId?: string | null;
  toAccountType?: AccountType | null;
};

// Returns per-account balance deltas produced by ADDING this transaction to the world.
// For credit-card accounts, sign is inverted (balance = amount owed, so a charge increases
// it and a refund decreases it).
function computeDeltas(tx: TxSnapshot): Map<string, Decimal> {
  const amt = new Decimal(tx.amount);
  const deltas = new Map<string, Decimal>();

  const applyTo = (
    accountId: string,
    accountType: AccountType,
    moneyDirection: 1 | -1, // +1 = money enters, -1 = money leaves
  ) => {
    const signed = moneyDirection === 1 ? amt : amt.negated();
    const finalDelta =
      accountType === AccountType.credit_card ? signed.negated() : signed;
    const current = deltas.get(accountId) ?? new Decimal(0);
    deltas.set(accountId, current.plus(finalDelta));
  };

  if (tx.type === TxType.income) {
    applyTo(tx.accountId, tx.accountType, 1);
  } else if (tx.type === TxType.expense) {
    applyTo(tx.accountId, tx.accountType, -1);
  } else if (
    tx.type === TxType.transfer &&
    tx.toAccountId &&
    tx.toAccountType
  ) {
    applyTo(tx.accountId, tx.accountType, -1);
    applyTo(tx.toAccountId, tx.toAccountType, 1);
  }

  return deltas;
}

// Merge multiple delta maps by summing per-account. Used in PUT (undo old + apply new).
function mergeDeltas(...maps: Map<string, Decimal>[]): Map<string, Decimal> {
  const merged = new Map<string, Decimal>();
  for (const m of maps) {
    for (const [accountId, delta] of m) {
      merged.set(
        accountId,
        (merged.get(accountId) ?? new Decimal(0)).plus(delta),
      );
    }
  }

  return merged;
}

// Build the Prisma promises that apply a delta map. Feed the result into a $transaction.
function deltaOps(deltas: Map<string, Decimal>) {
  const ops = [];
  for (const [accountId, delta] of deltas) {
    if (delta.isZero()) continue;

    ops.push(
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      }),
    );
  }

  return ops;
}

// GET all transactions
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, categoryId, type, startDate, endDate, tagIds } =
      req.query;

    const validType =
      typeof type === "string" &&
      (Object.values(TxType) as string[]).includes(type)
        ? (type as TxType)
        : undefined;

    const tagIdArray = tagIds
      ? Array.isArray(tagIds)
        ? (tagIds as string[])
        : [tagIds as string]
      : [];

    const userAccounts = await getUserAccounts(req.userId!);
    const accountIds = userAccounts.map((acc) => acc.id);

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        ...(accountId && { accountId: String(accountId) }),
        ...(categoryId && { categoryId: String(categoryId) }),
        ...(validType && { type: validType }),
        ...(startDate &&
          endDate && {
            date: {
              gte: new Date(String(startDate)),
              lte: new Date(String(endDate)),
            },
          }),
        ...(tagIdArray.length > 0 && {
          tags: {
            some: {
              tagId: { in: tagIdArray },
            },
          },
        }),
      },
      include: {
        account: true,
        toAccount: true,
        category: true,
        tags: { include: { tag: true } },
      },
      orderBy: { date: "desc" },
    });

    const formatted = transactions.map((t) => ({
      ...t,
      date: t.date.toISOString().split("T")[0],
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch transactions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET one transaction by id
router.get(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const transactionId = req.params.id;

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          account: true,
          toAccount: true,
          category: true,
          tags: { include: { tag: true } },
        },
      });
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const canAccess = await userCanAccessTransaction(
        req.userId!,
        transactionId,
      );
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this transaction" });
      }

      res.json(transaction);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST create a new transaction
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      accountId,
      categoryId,
      toAccountId,
      amount,
      date,
      description,
      type,
      status,
      notes,
      tagIds,
    } = req.body;

    const canAccess = await userCanEditTransactionInAccount(
      req.userId!,
      accountId,
    );
    if (!canAccess) {
      res.status(403).json({ error: "You do not have access to this account" });
      return;
    }

    if (type === TxType.transfer && !toAccountId) {
      res
        .status(400)
        .json({ error: "Transfer requieres a destination account" });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    const toAccount = toAccountId
      ? await prisma.account.findUnique({ where: { id: toAccountId } })
      : null;

    if (!account) {
      res.status(400).json({ error: "Account not found" });
      return;
    }

    const deltas = computeDeltas({
      type,
      amount,
      accountId,
      accountType: account.type,
      toAccountId: toAccount?.id,
      toAccountType: toAccount?.type,
    });

    if (type === TxType.transfer && toAccount) {
      const transferGroupId = crypto.randomUUID();
      const includeOpts = {
        account: true,
        toAccount: true,
        category: true,
        tags: { include: { tag: true } },
      };
      const shared = {
        transferGroupId,
        categoryId: categoryId || null,
        description,
        amount,
        date: new Date(date),
        type,
        status: status || "cleared",
        notes,
      };

      const [outTx, inTx] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            ...shared,
            accountId,
            toAccountId,
            direction: "out",
            tags: tagIds?.length
              ? {
                  create: tagIds.map((tagId: string) => ({ tagId })),
                }
              : undefined,
          },
          include: includeOpts,
        }),

        prisma.transaction.create({
          data: {
            ...shared,
            accountId: toAccountId,
            toAccountId: accountId,
            direction: "in",
            tags: tagIds?.length
              ? {
                  create: tagIds.map((tagId: string) => ({ tagId })),
                }
              : undefined,
          },
          include: includeOpts,
        }),
        ...deltaOps(deltas),
      ]);

      return res.status(201).json({ out: outTx, in: inTx });
    }

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          accountId,
          categoryId: categoryId || null,
          toAccountId: toAccountId || null,
          description,
          amount,
          date: new Date(date),
          type,
          status,
          notes,
          tags: tagIds?.length
            ? {
                create: tagIds.map((tagId: string) => ({ tagId })),
              }
            : undefined,
        },
        include: {
          account: true,
          toAccount: true,
          category: true,
          tags: { include: { tag: true } },
        },
      }),
      ...deltaOps(deltas),
    ]);

    res.status(201).json(transaction);
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to create transaction",
      details: err.message,
    });
  }
});

// PUT update a transaction by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const transactionId = req.params.id;

      const existing = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { account: true },
      });

      if (!existing) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const canAccess = await userCanAccessTransaction(
        req.userId!,
        transactionId,
      );
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this transaction" });
      }

      // Editing a transfer via this endpoint is not supported in Phase A — too many
      // edge cases (sibling row, matching amounts). Delete + recreate instead.
      if (
        existing.type === TxType.transfer ||
        req.body.type === TxType.transfer
      ) {
        return res.status(400).json({
          error:
            "Editing transfer is not supported. Delete and recreate instead.",
        });
      }

      const {
        categoryId,
        toAccountId,
        description,
        amount,
        date,
        type,
        status,
        notes,
        tagIds,
        accountId: newAccountId,
      } = req.body;

      const targetAccountId = newAccountId ?? existing.accountId;
      const newAccount = await prisma.account.findUnique({
        where: { id: targetAccountId },
      });
      if (!newAccount) {
        return res.status(400).json({ error: "Account not found" });
      }

      // Undo old, apply new — may touch two different accounts.
      const undoDeltas = computeDeltas({
        type: existing.type,
        amount: existing.amount,
        accountId: existing.accountId,
        accountType: existing.account.type,
      });

      // Negate to undo.
      const undoNegated = new Map(
        [...undoDeltas].map(([id, d]) => [id, d.negated()]),
      );

      const applyDeltas = computeDeltas({
        type,
        amount,
        accountId: targetAccountId,
        accountType: newAccount.type,
      });

      const merged = mergeDeltas(undoNegated, applyDeltas);

      const [transaction] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: {
            categoryId: categoryId || null,
            toAccountId: toAccountId || null,
            description,
            amount,
            date: new Date(date),
            type,
            status,
            notes,
            tags: tagIds?.length
              ? {
                  create: tagIds.map((tagId: string) => ({ tagId })),
                }
              : undefined,
          },
          include: {
            account: true,
            toAccount: true,
            category: true,
            tags: { include: { tag: true } },
          },
        }),
        ...deltaOps(merged),
      ]);

      res.json(transaction);
    } catch (error) {
      res.status(500).json({
        error: "Failed to update transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// TODO(balance-rework): Phase B — drop `direction` and make `amount` signed. This
// collapses computeDeltas to "balance += amount" per row and removes the credit_card
// sign inversion.
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const transactionId = req.params.id;

      const tx = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { account: true },
      });

      if (!tx) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const canAccess = await userCanEditTransactionInAccount(
        req.userId!,
        tx.accountId,
      );
      if (!canAccess) {
        res
          .status(403)
          .json({ error: "You do not have access to delete this transaction" });
        return;
      }

      if (tx.type === TxType.transfer && tx.transferGroupId) {
        const grouped = await prisma.transaction.findMany({
          where: { transferGroupId: tx.transferGroupId },
          include: { account: true },
        });

        const outRow = grouped.find((t) => t.direction === "out") ?? grouped[0];
        const sibling = grouped.find((t) => t.id !== outRow.id);

        const undo = computeDeltas({
          type: TxType.transfer,
          amount: outRow.amount,
          accountId: outRow.accountId,
          accountType: outRow.account.type,
          toAccountId: sibling?.accountId,
          toAccountType: sibling?.account.type,
        });

        const negated = new Map([...undo].map(([id, d]) => [id, d.negated()]));

        const ids = grouped.map((t) => t.id);
        await prisma.$transaction([
          prisma.transactionTag.deleteMany({
            where: { transactionId: { in: ids } },
          }),
          prisma.transaction.deleteMany({
            where: { transferGroupId: tx.transferGroupId },
          }),
          ...deltaOps(negated),
        ]);
      } else {
        const undo = computeDeltas({
          type: tx.type,
          amount: tx.amount,
          accountId: tx.accountId,
          accountType: tx.account.type,
        });
        const negated = new Map([...undo].map(([id, d]) => [id, d.negated()]));

        await prisma.$transaction([
          prisma.transactionTag.deleteMany({
            where: { transactionId },
          }),
          prisma.transaction.delete({
            where: { id: transactionId },
          }),
          ...deltaOps(negated),
        ]);
      }

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to delete transaction",
        details: err.message,
      });
    }
  },
);

export default router;
