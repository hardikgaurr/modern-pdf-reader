import { Router } from "express";

import { getPage } from "../controllers/pages.controller.js";
import {
  requireAuth,
  requireSubscriber,
} from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

// requireSubscriber here is a cheap first gate from the JWT claim;
// the controller re-verifies against the database as the authoritative check.
router.get("/:pageNumber", requireAuth, requireSubscriber, getPage);

export default router;
