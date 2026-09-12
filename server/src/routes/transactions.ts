import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getUserAccounts,
  userCanAccessTransaction,
  userCanEditTransactionInAccount,
} from "../services/authorization";
import { Decimal } from "@prisma/client/runtime/library";
import { TxType } from "@prisma/client";
import { signAmount, deltaOps } from "../services/balance";

const router = Router();

// GET all transactions
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { type, startDate, endDate, ownerId } = req.query;

    const toArray = (v: unknown): string[] =>
      Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? [v] : [];

    const selectedAccountIds = toArray(req.query.accountIds);
    const categoryIds = toArray(req.query.categoryIds);
    const tagIdArray = toArray(req.query.tagIds);

    const validType =
      typeof type === "string" &&
      (Object.values(TxType) as string[]).includes(type)
        ? (type as TxType)
        : undefined;

    const userAccounts = await getUserAccounts(req.userId!);
    const ownerFilter =
      typeof ownerId === "string" && ownerId.length > 0 ? ownerId : undefined;
    const accessibleIds = userAccounts
      .filter((acc) => !ownerFilter || acc.ownerId === ownerFilter)
      .map((acc) => acc.id);
    // Intersect the selected accounts with accessible ones (keeps access scope).
    const accountIds = selectedAccountIds.length
      ? accessibleIds.filter((id) => selectedAccountIds.includes(id))
      : accessibleIds;

    // Category filter: a list that may include the "none" (uncategorized) sentinel.
    const realCategoryIds = categoryIds.filter((id) => id !== "none");
    const categoryWhere =
      categoryIds.length === 0
        ? undefined
        : {
            OR: [
              ...(realCategoryIds.length
                ? [{ categoryId: { in: realCategoryIds } }]
                : []),
              ...(categoryIds.includes("none") ? [{ categoryId: null }] : []),
            ],
          };

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        ...(categoryWhere ?? {}),
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
        account: { include: { owner: { select: { id: true, name: true } } } },
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
      externalParty,
      direction,
    } = req.body;

    const canAccess = await userCanEditTransactionInAccount(
      req.userId!,
      accountId,
    );
    if (!canAccess) {
      res.status(403).json({ error: "You do not have access to this account" });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      return res.status(400).json({ error: "Account not found" });
    }

    const includeOpts = {
      account: true,
      toAccount: true,
      category: true,
      tags: { include: { tag: true } },
    };
    const tagCreate = tagIds?.length
      ? { create: tagIds.map((tagId: string) => ({ tagId })) }
      : undefined;

    if (type === TxType.transfer) {
      if (!toAccountId) {
        const signed =
          direction === "in"
            ? new Decimal(amount).abs()
            : new Decimal(amount).abs().negated();
        const [transaction] = await prisma.$transaction([
          prisma.transaction.create({
            data: {
              accountId,
              categoryId: categoryId || null,
              toAccountId: null,
              externalParty: externalParty || null,
              description,
              amount: signed,
              date: new Date(date),
              type: TxType.transfer,
              status: status || "cleared",
              notes,
              tags: tagCreate,
            },
            include: includeOpts,
          }),
          ...deltaOps([{ accountId, delta: signed }]),
        ]);
        return res.status(201).json(transaction);
      }

      const toAccount = await prisma.account.findUnique({
        where: { id: toAccountId },
      });
      if (!toAccount) {
        res.status(400).json({ error: "Destination account not found" });
        return;
      }

      const signed = new Decimal(amount);
      const transferGroupId = crypto.randomUUID();
      const shared = {
        transferGroupId,
        categoryId: categoryId || null,
        description,
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
            amount: signed.negated(),
            tags: tagCreate,
          },
          include: includeOpts,
        }),

        prisma.transaction.create({
          data: {
            ...shared,
            accountId: toAccountId,
            toAccountId: accountId,
            amount: signed,
            tags: tagCreate,
          },
          include: includeOpts,
        }),
        ...deltaOps([
          { accountId, delta: signed.negated() },
          { accountId: toAccountId, delta: signed },
        ]),
      ]);

      return res.status(201).json({ out: outTx, in: inTx });
    }

    const signed = signAmount(type, amount);
    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          accountId,
          categoryId: categoryId || null,
          toAccountId: toAccountId || null,
          description,
          amount: signed,
          date: new Date(date),
          type,
          status,
          notes,
          tags: tagCreate,
        },
        include: includeOpts,
      }),
      ...deltaOps([{ accountId, delta: signed }]),
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
      const targetAccount = await prisma.account.findUnique({
        where: { id: targetAccountId },
      });
      if (!targetAccount) {
        return res.status(400).json({ error: "Account not found" });
      }

      const newSigned = signAmount(type, amount);
      const undoOld = new Decimal(existing.amount).negated();

      const [transaction] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: {
            accountId: targetAccountId,
            categoryId: categoryId || null,
            toAccountId: toAccountId || null,
            description,
            amount: newSigned,
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
        ...deltaOps([
          { accountId: existing.accountId, delta: undoOld },
          { accountId: targetAccountId, delta: newSigned },
        ]),
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
        });
        const ids = grouped.map((t) => t.id);

        await prisma.$transaction([
          prisma.transactionTag.deleteMany({
            where: { transactionId: { in: ids } },
          }),
          prisma.transaction.deleteMany({
            where: { transferGroupId: tx.transferGroupId },
          }),
          ...deltaOps(
            grouped.map((t) => ({
              accountId: t.accountId,
              delta: new Decimal(t.amount).negated(),
            })),
          ),
        ]);
      } else {
        await prisma.$transaction([
          prisma.transactionTag.deleteMany({
            where: { transactionId },
          }),
          prisma.transaction.delete({
            where: { id: transactionId },
          }),
          ...deltaOps([
            {
              accountId: tx.accountId,
              delta: new Decimal(tx.amount).negated(),
            },
          ]),
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
