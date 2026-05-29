import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// GET all tags
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId! },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch tags",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// GET one tag by id with its transactions
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: req.params.id },
      include: {
        transactions: {
          include: { transaction: true },
        },
      },
    });
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }
    res.json(tag);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to fetch tag",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// POST create a tag
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    const existingTag = await prisma.tag.findFirst({
      where: { name, userId: req.userId! },
    });
    if (existingTag) {
      return res
        .status(409)
        .json({ error: "Tag with this name: " + name + " already exists" });
    }

    const tag = await prisma.tag.create({
      data: { name, color, userId: req.userId! },
    });
    res.status(201).json(tag);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to create tag",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// PUT update a tag by ID
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const existingTag = await prisma.tag.findUnique({
      where: { id: req.params.id },
    });
    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const { name, color } = req.body;
    const tag = await prisma.tag.update({
      where: { id: req.params.id },
      data: { name, color },
    });
    res.json(tag);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to update tag",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// DELETE a tag by ID
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;

    // Remove all associations with transactions first to avoid foreign key constraint issues
    await prisma.transactionTag.deleteMany({
      where: { tagId: id },
    });

    await prisma.tag.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to delete tag",
        details: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

export default router;
