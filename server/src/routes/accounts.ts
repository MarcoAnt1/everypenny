import { Router, Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET all accounts
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId! },
    });

    const enriched = accounts.map((account) => {
      if (account.type === "credit" && account.creditLimit) {
        const creditLimit = Number(account.creditLimit);
        const balance = Number(account.balance);
        const availableCredit = creditLimit - balance;
        const utilization = Math.round((balance / creditLimit) * 100);

        return { ...account, availableCredit, utilization };
      }

      return account;
    });
    res.json(enriched);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// GET one account by id
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: { transactions: true },
    });
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.json(account);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// POST create a new account
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, institution, balance, currency } = req.body;
    const account = await prisma.account.create({
      data: {
        userId: req.userId!,
        name,
        type,
        institution,
        balance,
        currency,
      },
    });
    res.status(201).json(account);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to create account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// PUT update a account by ID
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, type, institution, balance, currency } = req.body;
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: { name, type, institution, balance, currency },
    });
    res.json(account);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to update account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// DELETE a account by ID
router.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const { id } = req.params;
        
        const transactions = await prisma.transaction.findMany({
            where: { OR: [{ accountId: id }, { toAccountId: id }]}
        });

        const transactionIds = transactions.map(t => t.id);
        if (transactionIds.length > 0) {
            await prisma.transactionTag.deleteMany({
                where: { transactionId: { in: transactionIds }}
            });

            await prisma.transaction.deleteMany({
                where: { OR: [{ accountId: id}, { toAccountId: id }]}
            });
        }

        await prisma.account.delete({
            where: { id: req.params.id }
        });
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete account', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}); 

export default router;
