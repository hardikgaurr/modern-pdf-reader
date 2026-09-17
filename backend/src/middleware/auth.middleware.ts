import type { NextFunction, Request, Response } from "express";

import { type TokenPayload, verifyToken } from "../utils/jwt.util.js";

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Missing or malformed authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    res
      .status(401)
      .json({ error: "Missing or malformed authorization header" });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({
      error: "Administrator access required",
    });
    return;
  }

  next();
}

export function requireSubscriber(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "subscriber") {
    res.status(403).json({
      error: "Subscription required to access this content",
    });
    return;
  }

  next();
}
