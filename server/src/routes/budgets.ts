import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getConnectedUserIds,
  getUserAccounts,
  userCanAccessBudget,
} from "../helper/authorization";

const router = Router();

// GET all budgets
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const connectedUserIds = await getConnectedUserIds(
      req.userId!,
      "shareAllBudgets",
    );

    const budgets = await prisma.budget.findMany({
      where: {
        userId: {
          in: [req.userId!, ...connectedUserIds],
        },
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const accessibleAccounts = await getUserAccounts(req.userId!);
    const accessibleAccountIds = accessibleAccounts.map((account) => account.id);

    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const now = new Date();
        const startDate =
          budget.period === "monthly"
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), 0, 1);

        const spending = await prisma.transaction.aggregate({
          where: {
            accountId: { in: accessibleAccountIds },
            categoryId: budget.categoryId,
            type: "expense",
            date: { gte: startDate, lte: now },
          },
          _sum: { amount: true },
        });

        const spent = spending._sum.amount || 0;
        return {
          ...budget,
          spent,
          remaining: budget.limitAmount - spent,
          percentage: Math.round((spent / budget.limitAmount) * 100),
        };
      }),
    );
    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch budgets",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET one budget by id
router.get(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const budgetId = req.params.id;

      const canAccess = await userCanAccessBudget(req.userId!, budgetId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this budget" });
      }

      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { category: true },
      });
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }

      res.json(budget);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch budget",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET transactions for a specific budget
router.get(
  "/:id/transactions",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const budgetId = req.params.id;

      const canAccess = await userCanAccessBudget(req.userId!, budgetId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this budget" });
      }

      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { category: true },
      });

      if (!budget) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }

      const now = new Date();
      const startDate =
        budget.period === "monthly"
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : new Date(now.getFullYear(), 0, 1);

      const accessibleAccounts = await getUserAccounts(req.userId!);
      const accessibleAccountIds = accessibleAccounts.map((account) => account.id);

      const transactions = await prisma.transaction.findMany({
        where: {
          accountId: { in: accessibleAccountIds },
          categoryId: budget.categoryId,
          type: "expense",
          date: { gte: startDate, lte: now },
        },
        include: {
          account: true,
          category: true,
        },
        orderBy: { date: "desc" },
      });

      res.json({
        budget,
        transactions,
        total: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch budget transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST create a new budget
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, limitAmount, period } = req.body;
    const budget = await prisma.budget.create({
      data: {
        userId: req.userId!,
        name,
        categoryId,
        limitAmount,
        period: period || "monthly",
      },
      include: { category: true },
    });
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create budget",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT update a budget by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const budgetId = req.params.id;

      const canAccess = await userCanAccessBudget(req.userId!, budgetId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this budget" });
      }

      const { name, categoryId, limitAmount, period } = req.body;
      const budget = await prisma.budget.update({
        where: { id: budgetId },
        data: { name, categoryId, limitAmount, period },
        include: { category: true },
      });
      res.json(budget);
    } catch (error) {
      res.status(500).json({
        error: "Failed to update budget",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// DELETE a budget by ID
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const budgetId = req.params.id;

      const canAccess = await userCanAccessBudget(req.userId!, budgetId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this budget" });
      }

      await prisma.budget.delete({
        where: { id: budgetId },
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete budget",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
