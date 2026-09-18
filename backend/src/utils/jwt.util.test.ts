import assert from "node:assert/strict";
import test from "node:test";
import { signAccessToken, signRefreshToken, verifyToken } from "./jwt.util.js";

test("access token contains valid access payload", () => {
  const token = signAccessToken({
    userId: "507f1f77bcf86cd799439011",
    role: "subscriber",
  });

  const payload = verifyToken(token, "access");

  assert.equal(payload.userId, "507f1f77bcf86cd799439011");

  assert.equal(payload.role, "subscriber");

  assert.equal(payload.type, "access");
});

test("refresh token is rejected as access token", () => {
  const token = signRefreshToken({
    userId: "507f1f77bcf86cd799439011",
    role: "free",
  });

  assert.throws(() => verifyToken(token, "access"), /Invalid token payload/);
});

test("refresh token verifies correctly", () => {
  const token = signRefreshToken({
    userId: "507f1f77bcf86cd799439011",
    role: "free",
  });

  const payload = verifyToken(token, "refresh");

  assert.equal(payload.type, "refresh");
});
