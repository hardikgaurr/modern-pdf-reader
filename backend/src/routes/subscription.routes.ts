import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { subscriptionRateLimiter } from "../middleware/rate-limit.middleware.js";
import { subscribe } from "../controllers/subscription.controller.js";

const router = Router();

router.post("/", requireAuth, subscriptionRateLimiter, subscribe);

export default router;
