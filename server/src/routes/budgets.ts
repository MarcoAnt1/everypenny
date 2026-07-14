import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getConnectedUserIds,
  getUserAccounts,
  userCanAccessBudget,
} from "../helper/authorization";
import { Decimal } from "@prisma/client/runtime/library";
import { TxType, BudgetPeriod, Prisma } from "@prisma/client";

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
    const accessibleAccountIds = accessibleAccounts.map(
      (account) => account.id,
    );

    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const now = new Date();
        const startDate = periodStartDate(budget.period, now);

        const spending = await prisma.transaction.aggregate({
          where: {
            accountId: { in: accessibleAccountIds },
            categoryId: budget.categoryId,
            type: TxType.expense,
            date: { gte: startDate, lte: now },
          },
          _sum: { amount: true },
        });

        const spent = new Decimal(spending._sum.amount || 0).negated();
        const limitAmount = new Decimal(budget.limitAmount);
        return {
          ...budget,
          spent,
          remaining: limitAmount.minus(spent),
          percentage: limitAmount.isZero()
            ? 0
            : Math.round(spent.dividedBy(limitAmount).times(100).toNumber()),
        };
      }),
    );
    res.json(budgetsWithSpent);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch budgets",
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
    } catch (err) {
      res.status(500).json({
        error: "Failed to fetch budget",
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
      const startDate = periodStartDate(budget.period, now);

      const accessibleAccounts = await getUserAccounts(req.userId!);
      const accessibleAccountIds = accessibleAccounts.map(
        (account) => account.id,
      );

      const transactions = await prisma.transaction.findMany({
        where: {
          accountId: { in: accessibleAccountIds },
          categoryId: budget.categoryId,
          type: TxType.expense,
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
        total: transactions
          .reduce((sum: Decimal, t) => sum.plus(t.amount), new Decimal(0))
          .negated()
          .toString(),
      });
    } catch (err) {
      res.status(500).json({
        error: "Failed to fetch budget transactions",
      });
    }
  },
);

// POST create a new budget
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, limitAmount, period } = req.body;

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!Object.values(BudgetPeriod).includes(period)) {
      return res.status(400).json({ error: "Invalid period" });
    }
    const limitDecimal = new Decimal(limitAmount);
    if (limitDecimal.lessThanOrEqualTo(0)) {
      return res.status(400).json({ error: "Limit amount must be positive" });
    }

    // Authorize the category — must be system OR user-owned.
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { userId: true },
    });
    if (!category) {
      return res.status(400).json({ error: "Category not found" });
    }
    if (category.userId !== null && category.userId !== req.userId) {
      return res.status(403).json({ error: "You do not own the category" });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: req.userId!,
        name,
        categoryId,
        limitAmount,
        period: period || BudgetPeriod.monthly,
      },
      include: { category: true },
    });
    res.status(201).json(budget);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        error: "You already have a budget for this category and period",
      });
    }
    res.status(500).json({
      error: "Failed to create budget",
    });
  }
});

// PUT update a budget by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const id = req.params.id;
      const budget = await prisma.budget.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      if (budget.userId !== req.userId) {
        return res
          .status(403)
          .json({ error: "Only the owner can delete this budget" });
      }

      const { name, categoryId, limitAmount, period } = req.body;

      if (
        name !== undefined &&
        (typeof name !== "string" || name.trim().length === 0)
      ) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      if (
        period !== undefined &&
        !Object.values(BudgetPeriod).includes(period)
      ) {
        return res.status(400).json({ error: "Invalid period" });
      }
      if (limitAmount !== undefined) {
        const limitDecimal = new Decimal(limitAmount);
        if (limitDecimal.lessThanOrEqualTo(0)) {
          return res
            .status(400)
            .json({ error: "Limit amount must be positive" });
        }
      }
      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { userId: true },
        });
        if (!category) {
          return res.status(400).json({ error: "Category not found" });
        }
        if (category.userId !== null && category.userId !== req.userId) {
          return res.status(403).json({ error: "You do not own the category" });
        }
      }

      const updated = await prisma.budget.update({
        where: { id },
        data: { name, categoryId, limitAmount, period },
        include: { category: true },
      });
      res.json(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return res.status(409).json({
          error: "You already have a budget for this category and period",
        });
      }
      res.status(500).json({
        error: "Failed to update budget",
      });
    }
  },
);

// DELETE a budget by ID
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const id = req.params.id;
      const budget = await prisma.budget.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      if (budget.userId !== req.userId) {
        return res
          .status(403)
          .json({ error: "Only the owner can modify this budget" });
      }

      await prisma.budget.delete({
        where: { id },
      });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({
        error: "Failed to delete budget",
      });
    }
  },
);

function periodStartDate(period: BudgetPeriod, now: Date): Date {
  switch (period) {
    case BudgetPeriod.monthly:
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case BudgetPeriod.quarterly:
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    case BudgetPeriod.yearly:
      return new Date(now.getFullYear(), 0, 1);
  }
}

export default router;
