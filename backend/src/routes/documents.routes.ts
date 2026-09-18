import { Router } from "express";
import {
  listDocuments,
  uploadDocument,
} from "../controllers/documents.controller.js";
import {
  requireAdmin,
  requireAuth,
  requireSubscriber,
} from "../middleware/auth.middleware.js";
import { uploadRateLimiter } from "../middleware/rate-limit.middleware.js";
import { pdfUpload } from "../middleware/upload.middleware.js";
import pagesRoutes from "./pages.routes.js";
import bookmarkRoutes from "./bookmark.routes.js";
import {
  getReadingProgress,
  saveReadingProgress,
} from "../controllers/reading-progress.controller.js";

const router = Router();

router.get("/", requireAuth, listDocuments);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadRateLimiter,
  pdfUpload.single("file"),
  uploadDocument,
);

router.get("/:id/progress", requireAuth, requireSubscriber, getReadingProgress);

router.put(
  "/:id/progress",
  requireAuth,
  requireSubscriber,
  saveReadingProgress,
);

router.use("/:id/pages", pagesRoutes);

router.use("/:id/bookmarks", bookmarkRoutes);

export default router;
