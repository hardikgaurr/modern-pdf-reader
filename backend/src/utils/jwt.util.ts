import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { type UserRole } from "../models/User.js";

export type TokenType = "access" | "refresh";

export interface TokenPayload {
  userId: string;
  role: UserRole;
  type: TokenType;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "subscriber" || value === "free";
}

function isTokenType(value: unknown): value is TokenType {
  return value === "access" || value === "refresh";
}

function createToken(payload: TokenPayload, expiresIn: "15m" | "7d"): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn,
  });
}

export function signAccessToken(payload: Omit<TokenPayload, "type">): string {
  return createToken(
    {
      ...payload,
      type: "access",
    },
    "15m",
  );
}

export function signRefreshToken(payload: Omit<TokenPayload, "type">): string {
  return createToken(
    {
      ...payload,
      type: "refresh",
    },
    "7d",
  );
}

export function verifyToken(
  token: string,
  expectedType: TokenType,
): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string" ||
    !isUserRole(decoded.role) ||
    !isTokenType(decoded.type) ||
    decoded.type !== expectedType
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
    type: decoded.type,
  };
}
