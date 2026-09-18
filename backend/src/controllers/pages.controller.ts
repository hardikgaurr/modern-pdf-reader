import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { DocumentModel } from "../models/Document.js";
import { User } from "../models/User.js";
import { ViewLog } from "../models/ViewLog.js";
import { applyWatermark } from "../services/watermark.service.js";
import {
  downloadObject,
  getSignedUrl,
  removeObjects,
  uploadObject,
} from "../services/storage.service.js";

const SIGNED_URL_TTL_SECONDS = 15;
const EPHEMERAL_CLEANUP_DELAY_MS = 60_000;

function originalPagePath(documentId: string, pageNumber: number): string {
  return `documents/${documentId}/pages/${pageNumber}.png`;
}

function ephemeralPagePath(documentId: string, pageNumber: number): string {
  return `ephemeral/${documentId}/${pageNumber}/${randomUUID()}.png`;
}

function getSingleRouteParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
}

export async function getPage(req: AuthRequest, res: Response): Promise<void> {
  const documentId = getSingleRouteParam(req.params.id);

  const pageNumberParam = getSingleRouteParam(req.params.pageNumber);

  if (!documentId || !Types.ObjectId.isValid(documentId)) {
    res.status(400).json({
      error: "Invalid document ID",
    });
    return;
  }

  if (!pageNumberParam) {
    res.status(400).json({
      error: "Invalid page number",
    });
    return;
  }

  const pageNumber = Number(pageNumberParam);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    res.status(400).json({
      error: "Invalid page number",
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const currentUser = await User.findById(req.user.userId).lean();

  if (!currentUser) {
    res.status(401).json({
      error: "Account no longer exists",
    });
    return;
  }

  if (currentUser.role !== "subscriber") {
    res.status(403).json({
      error: "Subscription required to access this content",
    });
    return;
  }

  const documentRecord = await DocumentModel.findById(documentId).lean();

  if (!documentRecord) {
    res.status(404).json({
      error: "Document not found",
    });
    return;
  }

  if (documentRecord.status !== "ready") {
    res.status(409).json({
      error: "Document is not available for reading",
    });
    return;
  }

  if (pageNumber > documentRecord.totalPages) {
    res.status(400).json({
      error: "Page number exceeds document length",
    });
    return;
  }

  let ephemeralPath: string | undefined;

  try {
    const originalBuffer = await downloadObject(
      originalPagePath(documentId, pageNumber),
    );

    const watermarked = await applyWatermark(
      originalBuffer,
      currentUser._id.toString(),
      new Date().toISOString(),
    );

    ephemeralPath = ephemeralPagePath(documentId, pageNumber);

    await uploadObject(ephemeralPath, watermarked, "image/png");

    const signedUrl = await getSignedUrl(ephemeralPath, SIGNED_URL_TTL_SECONDS);

    await ViewLog.create({
      documentId,
      userId: currentUser._id,
      pageNumber,
    });

    res.set("Cache-Control", "no-store");

    res.status(200).json({
      url: signedUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error: unknown) {
    console.error(
      `Page delivery failed for document ${documentId}, page ${pageNumber}:`,
      error,
    );

    res.status(500).json({
      error: "Failed to deliver page",
    });

    return;
  } finally {
    if (ephemeralPath) {
      const pathToClean = ephemeralPath;

      setTimeout(() => {
        removeObjects([pathToClean]).catch((cleanupError: unknown) => {
          console.error(
            `Ephemeral cleanup failed for ${pathToClean}:`,
            cleanupError,
          );
        });
      }, EPHEMERAL_CLEANUP_DELAY_MS);
    }
  }
}
