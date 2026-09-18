import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../utils/jwt.util.js";

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();

  if (normalized.length === 0 || !normalized.includes("@")) {
    return null;
  }

  return normalized;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof mongoose.mongo.MongoServerError && error.code === 11000
  );
}

function userResponse(user: InstanceType<typeof User>) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    phone: user.phone,
    email: user.email,
    company: user.company,
    role: user.role,
  };
}

export async function signup(req: Request, res: Response): Promise<void> {
  const email = normalizeEmail(req.body?.email);

  const password = req.body?.password;

  if (
    !email ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    res.status(400).json({
      error: "Valid email and password (8-128 chars) required",
    });
    return;
  }

  const existing = await User.findOne({
    email,
  });

  if (existing) {
    res.status(409).json({
      error: "Email already registered",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;

  try {
    user = await User.create({
      email,
      passwordHash,
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        error: "Email already registered",
      });
      return;
    }

    throw error;
  }

  const payload = {
    userId: user.id,
    role: user.role,
  };

  res.status(201).json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: userResponse(user),
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const email = normalizeEmail(req.body?.email);

  const password = req.body?.password;

  if (!email || typeof password !== "string" || password.length === 0) {
    res.status(400).json({
      error: "Email and password are required",
    });
    return;
  }

  const user = await User.findOne({
    email,
  });

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
    user: userResponse(user),
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.body?.refreshToken;

  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    res.status(400).json({
      error: "Refresh token is required",
    });
    return;
  }

  try {
    const payload = verifyToken(refreshToken, "refresh");

    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        error: "Account no longer exists",
      });
      return;
    }

    const freshPayload = {
      userId: user.id,
      role: user.role,
    };

    res.status(200).json({
      accessToken: signAccessToken(freshPayload),
      refreshToken: signRefreshToken(freshPayload),
      user: userResponse(user),
    });
  } catch {
    res.status(401).json({
      error: "Invalid or expired refresh token",
    });
  }
}
