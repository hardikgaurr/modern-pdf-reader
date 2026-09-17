import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { type UserRole } from "../models/User.js";

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
