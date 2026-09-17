import type { Request, Response } from "express";

import bcrypt from "bcrypt";

import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.util.js";

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();

  return normalized.length > 0 ? normalized : null;
}

export async function signup(req: Request, res: Response): Promise<void> {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string" || password.length < 8) {
    res.status(400).json({
      error: "Valid email and password (min 8 chars) required",
    });
    return;
  }

  const existing = await User.findOne({ email });

  if (existing) {
    res.status(409).json({
      error: "Email already registered",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    email,
    passwordHash,
  });

  const payload = {
    userId: user.id,
    role: user.role,
  };

  res.status(201).json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      email: user.email,
      company: user.company,
      role: user.role,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string") {
    res.status(400).json({
      error: "Email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({
      error: "Invalid email or password",
    });
    return;
  }

  const payload = {
    userId: user.id,
    role: user.role,
  };

  res.json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      email: user.email,
      company: user.company,
      role: user.role,
    },
  });
}
