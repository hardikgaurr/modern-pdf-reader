import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export interface TokenPayload {
  userId: string;
  role: "subscriber" | "free";
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
