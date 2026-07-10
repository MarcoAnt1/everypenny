import { Request, Response, NextFunction } from "express";
import { env } from "../lib/env";
import jwt from "jsonwebtoken";

const { JWT_SECRET } = env;

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof (decoded as any).userId !== "string"
    ) {
      return res.status(401).json({ error: "Ivalid token" });
    }
    req.userId = (decoded as { userId: string }).userId;
    req.userEmail = (decoded as { email?: string }).email;
    next();
  } catch (error: any) {
    res
      .status(401)
      .json({ error: "Invalid or expired token", details: error.message });
  }
};
