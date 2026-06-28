import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { getConnectedUserIds } from "../helper/authorization";

const router = Router();

// GET all goals
router.get("/", async (req: AuthRequest, res: Response) => {
  try {

    const connectedUserIds = await getConnectedUserIds(req.userId!, "shareAllGoals");

    const goals = await prisma.goal.findMany({
      where: { 
        userId: {
          in: [req.userId!, ...connectedUserIds],
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true }},
      },
      orderBy: { createdAt: "asc" },
    });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const current = Number(goal.currentAmount);
        const target = Number(goal.targetAmount);

        return {
          ...goal,
          percentage: target > 0 ? Math.round((current / target) * 100) : 0,
          remainingAmount: target - current,
        };
      }),
    );
    res.json(goalsWithProgress);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch goals",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// GET one goal by id
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: req.params.id },
    });
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json({
      ...goal,
      percentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
      remainingAmount: goal.targetAmount - goal.currentAmount,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

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
    res
      .status(500)
      .json({
        error: "Failed to create goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// PUT update a goal by ID
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const existingGoal = await prisma.goal.findUnique({
      where: { id: req.params.id },
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
      where: { id: req.params.id },
      data: {
        name,
        description,
        targetAmount,
        currentAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
        status,
      },
    });
    res.json({
      ...goal,
      percentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
      remainingAmount: goal.targetAmount - goal.currentAmount,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to update goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// PATCH add founds to a goal
router.patch(
  "/:id/add-funds",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { amount } = req.body;

      const goal = await prisma.goal.findUnique({
        where: { id: req.params.id },
      });
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const newAmount = goal.currentAmount + amount;
      const isCompleted = newAmount >= goal.targetAmount;

      const updatedGoal = await prisma.goal.update({
        where: { id: req.params.id },
        data: {
          currentAmount: newAmount,
          status: isCompleted ? "completed" : goal.status,
        },
      });

      res.json({
        ...updatedGoal,
        percentage: Math.round(
          (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100,
        ),
        remaningAmount: updatedGoal.targetAmount - updatedGoal.currentAmount,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: "Failed to add funds to goal",
          details: error instanceof Error ? error.message : "Unknown error",
        });
    }
  },
);

// DELETE a goal by ID
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await prisma.goal.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to delete goal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

export default router;
