import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getConnectedUserIds,
  userCanAccessCategory,
} from "../services/authorization";
import { Prisma } from "@prisma/client";

const router = Router();

// GET all categories
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const connectedUserIds = await getConnectedUserIds(
      req.userId!,
      "shareAllCategories",
    );

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: { in: [req.userId!, ...connectedUserIds] } },
        ],
        parentId: null,
      },
      include: {
        subcategories: true,
      },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch categories",
    });
  }
});

// GET one category by ID
router.get(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const categoryId = req.params.id;

      const canAccess = await userCanAccessCategory(req.userId!, categoryId);
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this category" });
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { subcategories: true },
      });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (err) {
      res.status(500).json({
        error: "Failed to fetch category",
      });
    }
  },
);

// POST create a new category
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon, parentId } = req.body;

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (!parent) {
        return res.status(400).json({ error: "Parent category not found" });
      }
      if (parent.userId !== null && parent.userId !== req.userId) {
        return res
          .status(403)
          .json({ error: "You do not own the parent category" });
      }
    }
    const category = await prisma.category.create({
      data: {
        userId: req.userId!,
        name,
        icon,
        parentId: parentId || null,
      },
    });
    res.status(201).json(category);
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        error:
          "You already have a category with this name under the same parent",
      });
    }
    res.status(500).json({
      error: "Failed to create category",
    });
  }
});

// PUT update a category by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const categoryId = req.params.id;
      const { name, icon, parentId } = req.body;

      if (
        name !== undefined &&
        (typeof name !== "string" || name.trim().length === 0)
      ) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { userId: true },
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      if (category.userId === null) {
        return res
          .status(403)
          .json({ error: "System categories cannot be modified" });
      }
      if (category.userId !== req.userId) {
        return res
          .status(403)
          .json({ error: "Only the owner can modify this category" });
      }

      if (parentId) {
        if (parentId === categoryId) {
          return res
            .status(400)
            .json({ error: "Category cannot be its own parent" });
        }
        const parent = await prisma.category.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });
        if (!parent) {
          return res.status(400).json({ error: "Parent category not found" });
        }
        if (parent.userId !== null && parent.userId !== req.userId) {
          return res
            .status(403)
            .json({ error: "You do not own the parent category" });
        }
      }

      const updated = await prisma.category.update({
        where: { id: categoryId },
        data: { name, icon, parentId: parentId || null },
      });
      res.json(updated);
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return res.status(409).json({
          error:
            "You already have a category with this name under the same parent",
        });
      }
      res.status(500).json({ error: "Failed to update category" });
    }
  },
);

// DELETE a category by ID
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const categoryId = req.params.id;

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { userId: true },
      });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      if (category.userId === null) {
        return res
          .status(403)
          .json({ error: "System categories cannot be deleted" });
      }
      if (category.userId !== req.userId) {
        return res
          .status(403)
          .json({ error: "Only the owner can delete this category" });
      }

      await prisma.category.delete({
        where: { id: categoryId },
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete category",
      });
    }
  },
);

export default router;
