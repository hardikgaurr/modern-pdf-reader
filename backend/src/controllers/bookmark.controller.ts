import type { Response } from "express";
import { Types } from "mongoose";

import type { AuthRequest } from "../middleware/auth.middleware.js";
import { Bookmark } from "../models/Bookmark.js";
import { DocumentModel } from "../models/Document.js";
import { User } from "../models/User.js";

function getSingleRouteParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
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
      error: "Subscription required to access bookmarks",
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

function parsePageNumber(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const pageNumber = Number(value);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return null;
  }

  return pageNumber;
}

export async function listBookmarks(
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

  const bookmarks = await Bookmark.find({
    userId: currentUser._id,
    documentId: documentRecord._id,
  })
    .select("_id pageNumber createdAt updatedAt")
    .sort({ pageNumber: 1 })
    .lean();

  res.status(200).json({
    bookmarks,
  });
}

export async function createBookmark(
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

  const pageNumber = req.body?.pageNumber;

  if (
    typeof pageNumber !== "number" ||
    !Number.isInteger(pageNumber) ||
    pageNumber < 1
  ) {
    res.status(400).json({
      error: "Page number must be a positive integer",
    });

    return;
  }

  if (pageNumber > documentRecord.totalPages) {
    res.status(400).json({
      error: "Page number exceeds document length",
    });

    return;
  }

  const existingBookmark = await Bookmark.findOne({
    userId: currentUser._id,
    documentId: documentRecord._id,
    pageNumber,
  })
    .select("_id pageNumber createdAt updatedAt")
    .lean();

  if (existingBookmark) {
    res.status(200).json({
      bookmark: existingBookmark,
    });

    return;
  }

  const bookmark = await Bookmark.create({
    userId: currentUser._id,
    documentId: documentRecord._id,
    pageNumber,
  });

  res.status(201).json({
    bookmark: {
      id: bookmark._id,
      pageNumber: bookmark.pageNumber,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
    },
  });
}

export async function deleteBookmark(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const documentId = getSingleRouteParam(req.params.id);
  const pageNumber = parsePageNumber(req.params.pageNumber);

  if (!documentId) {
    res.status(400).json({
      error: "Invalid document ID",
    });

    return;
  }

  if (pageNumber === null) {
    res.status(400).json({
      error: "Invalid page number",
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

  if (pageNumber > documentRecord.totalPages) {
    res.status(400).json({
      error: "Page number exceeds document length",
    });

    return;
  }

  const deletedBookmark = await Bookmark.findOneAndDelete({
    userId: currentUser._id,
    documentId: documentRecord._id,
    pageNumber,
  });

  if (!deletedBookmark) {
    res.status(404).json({
      error: "Bookmark not found",
    });

    return;
  }

  res.status(200).json({
    message: "Bookmark removed successfully",
  });
}
