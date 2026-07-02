import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  getConnectedUserIds,
  userCanAccessCategory,
} from "../helper/authorization";

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
        userId: {
          in: [req.userId!, ...connectedUserIds],
        },
        parentId: null,
      },
      include: {
        subcategories: true,
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch categories",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET one category by ID
router.get("/:id", async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
  try {
    const categoryId = req.params.id;

    const canAccess = await userCanAccessCategory(req.userId!, categoryId);
    if (!canAccess) {
      return res.status(403).json({ error: "You do not have access to this category" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subcategories: true },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch category",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST create a new category
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, icon, parentId } = req.body;

    if (parentId) {
      const parentExists = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parentExists) {
        return res.status(400).json({ error: "Parent category not found" });
      }
    }
    const category = await prisma.category.create({
      data: { userId: req.userId, name, type, icon, parentId: parentId || null },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create category",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT update a category by ID
router.put("/:id", async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
  try {
    const categoryId = req.params.id;

    const canAccess = await userCanAccessCategory(req.userId!, categoryId);
    if (!canAccess) {
      return res.status(403).json({ error: "You do not have access to this category" });
    }

    const { name, type, icon, parentId } = req.body;
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name, type, icon, parentId: parentId || null },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update category",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE a category by ID
router.delete("/:id", async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
  try {
    const categoryId = req.params.id;

    const canAccess = await userCanAccessCategory(req.userId!, categoryId);
    if (!canAccess) {
      return res.status(403).json({ error: "You do not have access to this category" });
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete category",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
