import { Router, Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getUserAccounts,
  userCanAccessAccount,
  userIsAccountOwner,
} from "../helper/authorization";
import prisma from "../lib/prisma";
import { AccountType } from "@prisma/client";

const router = Router();

// GET all accounts
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await getUserAccounts(req.userId!);

    const enriched = accounts.map((account) => {
      if (account.type === AccountType.credit_card && account.creditLimit) {
        const creditLimit = Number(account.creditLimit);
        const balance = Number(account.balance);
        const availableCredit = creditLimit - balance;
        const utilization = Math.round((balance / creditLimit) * 100);

        return { ...account, availableCredit, utilization };
      }

      return account;
    });
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to fetch accounts",
      details: err.message,
    });
  }
});

// GET one account by id
router.get(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const accountId = req.params.id;

      const canAccess = await userCanAccessAccount(req.userId!, accountId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this account" });
      }

      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { transactions: true },
      });
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to fetch account",
        details: err.message,
      });
    }
  },
);

// POST create a new account
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, institution, balance, currency } = req.body;
    const account = await prisma.account.create({
      data: {
        ownerId: req.userId!,
        name,
        type,
        institution,
        balance,
        currency,
      },
    });

    await prisma.accountShare.create({
      data: {
        accountId: account.id,
        userId: req.userId!,
        role: "OWNER",
      },
    });

    res.status(201).json(account);
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to create account",
      details: err.message,
    });
  }
});

// POST share account with another user
router.post(
  "/:id/share",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const accountId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
      }

      const isOwner = await userIsAccountOwner(req.userId!, accountId);
      if (!isOwner) {
        res.status(403).json({ error: "Only account owner can share" });
        return;
      }

      const acceptedConnection = await prisma.connection.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: req.userId!, inviteeId: userId },
            { requesterId: userId, inviteeId: req.userId! },
          ],
        },
      });

      if (!acceptedConnection) {
        return res.status(403).json({
          error: "You must have an accepted connection with this user",
        });
      }

      const existing = await prisma.accountShare.findUnique({
        where: { accountId_userId: { accountId: accountId, userId } },
      });
      if (existing) {
        res
          .status(409)
          .json({ error: "Account already shared with this user" });
        return;
      }

      const share = await prisma.accountShare.create({
        data: {
          accountId: accountId,
          userId,
          role: "EDITOR",
        },
      });

      res.status(201).json(share);
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to share account",
        details: err.message,
      });
    }
  },
);

// PUT update an account by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const accountId = req.params.id;

      const canAccess = await userCanAccessAccount(req.userId!, accountId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this account" });
      }

      const { name, type, institution, balance, currency } = req.body;
      const account = await prisma.account.update({
        where: { id: accountId },
        data: { name, type, institution, balance, currency },
      });
      res.json(account);
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to update account",
        details: err.message,
      });
    }
  },
);

// DELETE an account by ID
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const accountId = req.params.id;

      const canAccess = await userCanAccessAccount(req.userId!, accountId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this account" });
      }

      const isOwner = await userIsAccountOwner(req.userId!, accountId);
      if (!isOwner) {
        res.status(403).json({ error: "Only account owner can delete" });
        return;
      }

      const transactions = await prisma.transaction.findMany({
        where: { OR: [{ accountId: accountId }, { toAccountId: accountId }] },
      });

      const transactionIds = transactions.map((t) => t.id);
      if (transactionIds.length > 0) {
        await prisma.transactionTag.deleteMany({
          where: { transactionId: { in: transactionIds } },
        });

        await prisma.transaction.deleteMany({
          where: { OR: [{ accountId: accountId }, { toAccountId: accountId }] },
        });
      }

      await prisma.accountShare.deleteMany({
        where: { accountId },
      });

      await prisma.account.delete({
        where: { id: accountId },
      });

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to delete account",
        details: err.message,
      });
    }
  },
);

// DELETE remove shared access to account
router.delete(
  "/:id/share/:userId",
  async (
    req: AuthRequest & Request<{ id: string; userId: string }>,
    res: Response,
  ) => {
    try {
      const { id, userId } = req.params;

      const isOwner = await userIsAccountOwner(req.userId!, id);
      if (!isOwner) {
        res.status(403).json({ error: "Only account owner can remove access" });
        return;
      }

      await prisma.accountShare.delete({
        where: { accountId_userId: { accountId: id, userId } },
      });

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to remove share",
        details: err.message,
      });
    }
  },
);

export default router;
