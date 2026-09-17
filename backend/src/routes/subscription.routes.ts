import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { subscribe } from "../controllers/subscription.controller.js";

const router = Router();

router.post("/", requireAuth, subscribe);

export default router;
