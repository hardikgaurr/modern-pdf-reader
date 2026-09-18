import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { DocumentModel } from "../models/Document.js";
import { ReadingProgress } from "../models/ReadingProgress.js";
import { User } from "../models/User.js";

function getSingleRouteParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && (error as { code?: unknown }).code === 11000;
}

async function getAuthorizedSubscriber(
  req: AuthRequest,
  res: Response,
): Promise<{ _id: Types.ObjectId } | null> {
  if (!req.user) {
    res.status(401).json({
      error: "Authentication required",
    });
    return null;
  }

  const currentUser = await User.findById(req.user.userId).lean();

  if (!currentUser) {
    res.status(401).json({
      error: "Account no longer exists",
    });
    return null;
  }

  if (currentUser.role !== "subscriber") {
    res.status(403).json({
      error: "Subscription required to access reading progress",
    });
    return null;
  }

  return {
    _id: currentUser._id,
  };
}

async function getReadyDocument(documentId: string, res: Response) {
  if (!Types.ObjectId.isValid(documentId)) {
    res.status(400).json({
      error: "Invalid document ID",
    });
    return null;
  }

  const documentRecord = await DocumentModel.findById(documentId).lean();

  if (!documentRecord) {
    res.status(404).json({
      error: "Document not found",
    });
    return null;
  }

  if (documentRecord.status !== "ready") {
    res.status(409).json({
      error: "Document is not available for reading",
    });
    return null;
  }

  return documentRecord;
}

export async function getReadingProgress(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const documentId = getSingleRouteParam(req.params.id);

  if (!documentId) {
    res.status(400).json({
      error: "Invalid document ID",
    });
    return;
  }

  const currentUser = await getAuthorizedSubscriber(req, res);

  if (!currentUser) {
    return;
  }

  const documentRecord = await getReadyDocument(documentId, res);

  if (!documentRecord) {
    return;
  }

  const progress = await ReadingProgress.findOne({
    userId: currentUser._id,
    documentId: documentRecord._id,
  })
    .select("documentId currentPage createdAt updatedAt")
    .lean();

  res.status(200).json({
    progress,
  });
}

export async function saveReadingProgress(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const documentId = getSingleRouteParam(req.params.id);

  if (!documentId) {
    res.status(400).json({
      error: "Invalid document ID",
    });
    return;
  }

  const currentUser = await getAuthorizedSubscriber(req, res);

  if (!currentUser) {
    return;
  }

  const documentRecord = await getReadyDocument(documentId, res);

  if (!documentRecord) {
    return;
  }

  const currentPage = req.body?.currentPage;

  if (
    typeof currentPage !== "number" ||
    !Number.isInteger(currentPage) ||
    currentPage < 1
  ) {
    res.status(400).json({
      error: "Current page must be a positive integer",
    });
    return;
  }

  if (currentPage > documentRecord.totalPages) {
    res.status(400).json({
      error: "Current page exceeds document length",
    });
    return;
  }

  const query = {
    userId: currentUser._id,
    documentId: documentRecord._id,
  };

  const update = {
    $set: {
      currentPage,
    },
  };

  let progress;

  try {
    progress = await ReadingProgress.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    })
      .select("documentId currentPage createdAt updatedAt")
      .lean();
  } catch (error: unknown) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    progress = await ReadingProgress.findOneAndUpdate(query, update, {
      new: true,
      runValidators: true,
    })
      .select("documentId currentPage createdAt updatedAt")
      .lean();

    if (!progress) {
      throw error;
    }
  }

  res.status(200).json({
    progress,
  });
}
