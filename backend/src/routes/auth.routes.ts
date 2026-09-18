import { Router } from "express";
import { login, refresh, signup } from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/signup", authRateLimiter, signup);

router.post("/login", authRateLimiter, login);

router.post("/refresh", authRateLimiter, refresh);

export default router;
