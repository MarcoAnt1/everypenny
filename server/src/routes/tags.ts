import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { Prisma } from "@prisma/client";

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
    res.status(500).json({
      error: "Failed to fetch tags",
    });
  }
});

// GET one tag by id with its transactions
router.get(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
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
      if (tag.userId !== req.userId) {
        return res.status(403).json({ error: "You do not own this tag" });
      }
      res.json(tag);
    } catch (err) {
      res.status(500).json({
        error: "Failed to fetch tag",
      });
    }
  },
);

// POST create a tag
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const tag = await prisma.tag.create({
      data: { name, color, userId: req.userId! },
    });
    res.status(201).json(tag);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "You already have a tag with this name" });
    }
    res.status(500).json({
      error: "Failed to create tag",
    });
  }
});

// PUT update a tag by ID
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const existingTag = await prisma.tag.findUnique({
        where: { id: req.params.id },
        select: { userId: true },
      });
      if (!existingTag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      if (existingTag.userId !== req.userId) {
        return res.status(403).json({ error: "You do not own this tag" });
      }

      const { name, color } = req.body;
      if (
        name !== undefined &&
        (typeof name !== "string" || name.trim().length === 0)
      ) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      const tag = await prisma.tag.update({
        where: { id: req.params.id },
        data: { name, color },
      });
      res.json(tag);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return res
          .status(409)
          .json({ error: "You already have a tag with this name" });
      }
      res.status(500).json({
        error: "Failed to update tag",
      });
    }
  },
);

// DELETE a tag by ID
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const id = req.params.id;
      const existingTag = await prisma.tag.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existingTag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      if (existingTag.userId !== req.userId) {
        return res.status(403).json({ error: "You do not own this tag" });
      }

      await prisma.tag.delete({
        where: { id },
      });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({
        error: "Failed to delete tag",
      });
    }
  },
);

export default router;
