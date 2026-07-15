import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { ConnectionStatus } from "@prisma/client";
import { normalizeEmail } from "../utils/normalize";

const router = Router();

// Post invite a user by email
router.post("/invite", async (req: AuthRequest, res: Response) => {
  try {
    const {
      shareAllAccounts,
      shareAllBudgets,
      shareAllCategories,
      shareAllGoals,
    } = req.body;

    const inviteeEmail = normalizeEmail(req.body.inviteeEmail);
    if (!inviteeEmail) {
      res.status(400).json({ error: "inviteeEmail is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: inviteeEmail },
    });
    if (user && user.id === req.userId) {
      res.status(400).json({ error: "Cannot invite yourself" });
      return;
    }

    const existing = await prisma.connection.findUnique({
      where: {
        requesterId_inviteeEmail: {
          requesterId: req.userId!,
          inviteeEmail,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: "Connection already exists" });
      return;
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: req.userId!,
        inviteeId: user?.id || null,
        inviteeEmail,
        shareAllAccounts: shareAllAccounts || false,
        shareAllBudgets: shareAllBudgets || false,
        shareAllCategories: shareAllCategories || false,
        shareAllGoals: shareAllGoals || false,
      },
    });

    res.status(201).json(connection);
  } catch (err) {
    res.status(500).json({ error: "Failed to invite user" });
  }
});

// GET all connections for current user (sent and received)
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const [sent, received] = await Promise.all([
      prisma.connection.findMany({
        where: { requesterId: req.userId! },
        include: { requester: true, invitee: true },
      }),
      prisma.connection.findMany({
        where: { inviteeId: req.userId! },
        include: { requester: true, invitee: true },
      }),
    ]);

    res.json({ sent, received });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// POST accept a connection
router.post(
  "/:id/accept",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;

      const connection = await prisma.connection.findUnique({ where: { id } });
      if (!connection) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }

      if (connection.inviteeId !== req.userId!) {
        res
          .status(403)
          .json({ error: "Only the invitee can accept this connection" });
        return;
      }

      if (connection.status !== ConnectionStatus.PENDING) {
        res.status(400).json({
          error: `Cannot accept a ${connection.status.toLowerCase()} connection`,
        });
        return;
      }

      const updated = await prisma.connection.update({
        where: { id },
        data: {
          status: ConnectionStatus.ACCEPTED,
          inviteeId: req.userId!,
        },
        include: { requester: true, invitee: true },
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to accept connection" });
    }
  },
);

// POST reject a connection
router.post(
  "/:id/reject",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;

      const connection = await prisma.connection.findUnique({ where: { id } });
      if (!connection) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }

      if (connection.inviteeId !== req.userId!) {
        res
          .status(403)
          .json({ error: "Only the invitee can reject this connection" });
        return;
      }

      if (connection.status !== ConnectionStatus.PENDING) {
        res.status(400).json({
          error: `Cannot reject a ${connection.status.toLowerCase()} connection`,
        });
        return;
      }

      const updated = await prisma.connection.update({
        where: { id },
        data: {
          status: ConnectionStatus.DECLINED,
        },
        include: { requester: true, invitee: true },
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to reject connection" });
    }
  },
);

// DELETE a connection
router.delete(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;

      const connection = await prisma.connection.findUnique({ where: { id } });
      if (!connection) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }

      if (
        connection.requesterId !== req.userId! &&
        connection.inviteeId !== req.userId!
      ) {
        res.status(403).json({ error: "You cannot delete this connection" });
        return;
      }

      await prisma.connection.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete connection" });
    }
  },
);

// PUT update sharing preferences for a connection
router.put(
  "/:id",
  async (req: AuthRequest & Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const {
        shareAllAccounts,
        shareAllBudgets,
        shareAllCategories,
        shareAllGoals,
      } = req.body;

      const connection = await prisma.connection.findUnique({ where: { id } });
      if (!connection) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }

      if (connection.requesterId !== req.userId!) {
        res
          .status(403)
          .json({ error: "Only the requester can update sharing preferences" });
        return;
      }

      const update = await prisma.connection.update({
        where: { id },
        data: {
          shareAllAccounts:
            shareAllAccounts !== undefined
              ? shareAllAccounts
              : connection.shareAllAccounts,
          shareAllBudgets:
            shareAllBudgets !== undefined
              ? shareAllBudgets
              : connection.shareAllBudgets,
          shareAllCategories:
            shareAllCategories !== undefined
              ? shareAllCategories
              : connection.shareAllCategories,
          shareAllGoals:
            shareAllGoals !== undefined
              ? shareAllGoals
              : connection.shareAllGoals,
        },
        include: { requester: true, invitee: true },
      });

      res.json(update);
    } catch (err) {
      res.status(500).json({ error: "Failed to update connection" });
    }
  },
);

export default router;
