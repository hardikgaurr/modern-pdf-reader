import { Router } from "express";

import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
} from "../controllers/bookmark.controller.js";
import {
  requireAuth,
  requireSubscriber,
} from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireSubscriber, listBookmarks);

router.post("/", requireAuth, requireSubscriber, createBookmark);

router.delete("/:pageNumber", requireAuth, requireSubscriber, deleteBookmark);

export default router;
