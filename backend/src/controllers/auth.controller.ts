import type { Request, Response } from "express";
import bcrypt from "bcrypt";

import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.util.js";

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password || password.length < 8) {
    res
      .status(400)
      .json({ error: "Valid email and password (min 8 chars) required" });
    return;
  }

  const existing = await User.findOne({ email });

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
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
      email: user.email,
      role: user.role,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: "Invalid email or password" });
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
      email: user.email,
      role: user.role,
    },
  });
}
