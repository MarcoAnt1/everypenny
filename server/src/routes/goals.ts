import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getConnectedUserIds,
  userCanAccessGoal,
} from "../services/authorization";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();

// GET all goals
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const connectedUserIds = await getConnectedUserIds(
      req.userId!,
      "shareAllGoals",
    );

    const goals = await prisma.goal.findMany({
      where: {
        userId: {
          in: [req.userId!, ...connectedUserIds],
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const goalsWithProgress = goals.map((goal) => {
      const current = new Decimal(goal.currentAmount);
      const target = new Decimal(goal.targetAmount);

      return {
        ...goal,
        percentage: target.isZero()
          ? 0
          : Math.round(current.dividedBy(target).times(100).toNumber()),
        remainingAmount: target.minus(current),
      };
    });
    res.json(goalsWithProgress);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch goals",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET one goal by id
router.get(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const goalId = req.params.id;

      const canAccess = await userCanAccessGoal(req.userId!, goalId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this goal" });
      }

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      });
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const currentAmount = new Decimal(goal.currentAmount);
      const targetAmount = new Decimal(goal.targetAmount);

      res.json({
        ...goal,
        percentage: targetAmount.isZero()
          ? 0
          : Math.round(
              currentAmount.dividedBy(targetAmount).times(100).toNumber(),
            ),
        remainingAmount: targetAmount.minus(currentAmount),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST create a new goal
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, targetAmount, currentAmount, targetDate } =
      req.body;
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        name,
        description,
        targetAmount,
        currentAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create goal",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT update a goal by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const goalId = req.params.id;

      const canAccess = await userCanAccessGoal(req.userId!, goalId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this goal" });
      }

      const existingGoal = await prisma.goal.findUnique({
        where: { id: goalId },
      });
      if (!existingGoal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const {
        name,
        description,
        targetAmount,
        currentAmount,
        targetDate,
        status,
      } = req.body;
      const goal = await prisma.goal.update({
        where: { id: goalId },
        data: {
          name,
          description,
          targetAmount,
          currentAmount,
          targetDate: targetDate ? new Date(targetDate) : null,
          status,
        },
      });

      const putCurrent = new Decimal(goal.currentAmount);
      const putTarget = new Decimal(goal.targetAmount);

      res.json({
        ...goal,
        percentage: putTarget.isZero()
          ? 0
          : Math.round(putCurrent.dividedBy(putTarget).times(100).toNumber()),
        remainingAmount: putTarget.minus(putCurrent),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to update goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// PATCH add founds to a goal
router.patch(
  "/:id/add-funds",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const goalId = req.params.id;

      const canAccess = await userCanAccessGoal(req.userId!, goalId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this goal" });
      }

      const { amount } = req.body;
      if (amount === null || amount === undefined || isNaN(Number(amount))) {
        return res.status(400).json({ error: "Amount must be a valid number" });
      }
      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lessThanOrEqualTo(0)) {
        return res
          .status(400)
          .json({ error: "Amount must be greater than zero" });
      }

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      });
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const newAmount = new Decimal(goal.currentAmount).plus(amountDecimal);
      const isCompleted = newAmount.greaterThanOrEqualTo(goal.targetAmount);

      const updatedGoal = await prisma.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: newAmount,
          status: isCompleted ? "completed" : goal.status,
        },
      });

      const updateCurrentAmount = new Decimal(updatedGoal.currentAmount);
      const updateTargetAmount = new Decimal(updatedGoal.targetAmount);

      res.json({
        ...updatedGoal,
        percentage: updateTargetAmount.isZero()
          ? 0
          : Math.round(
              updateCurrentAmount
                .dividedBy(updateTargetAmount)
                .times(100)
                .toNumber(),
            ),
        remainingAmount: updateTargetAmount.minus(updateCurrentAmount),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to add funds to goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// DELETE a goal by ID
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const goalId = req.params.id;

      const canAccess = await userCanAccessGoal(req.userId!, goalId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this goal" });
      }

      await prisma.goal.delete({
        where: { id: goalId },
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
