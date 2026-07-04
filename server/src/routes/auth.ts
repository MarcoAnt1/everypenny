import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const INVITE_TOKEN = process.env.INVITE_TOKEN;

const normalizeEmail = (raw: unknown): string => typeof raw === "string" ? raw.trim().toLowerCase() : "";

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, password, inviteToken } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!inviteToken || inviteToken !== INVITE_TOKEN) {
      return res.status(401).json({ error: "Invalid invite token"});
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to register", details: error.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to login", details: error.message });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    if (!user) {
      res.status(403).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(401).json({ error: "Invalid token", details: error.message });
  }
});

export default router;

