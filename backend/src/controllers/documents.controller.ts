import { unlink, readFile } from "node:fs/promises";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { DocumentModel } from "../models/Document.js";
import { getPdfPageCount } from "../services/pdf-validation.service.js";
import { renderAllPdfPages } from "../services/pdf-processor.service.js";
import { removeObjects, uploadObject } from "../services/storage.service.js";

const PDF_MAGIC_BYTES = Buffer.from("%PDF-");
const MAX_PAGES = 500;

function pageObjectPath(documentId: string, pageNumber: number): string {
  return `documents/${documentId}/pages/${pageNumber}.png`;
}

export async function uploadDocument(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      error: "PDF file is required",
    });
    return;
  }

  const uploadedPaths: string[] = [];
  let documentId: string | null = null;

  try {
    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : "";

    if (!title || title.length > 200) {
      res.status(400).json({
        error: "A valid title (1-200 characters) is required",
      });
      return;
    }

    let fileBuffer: Buffer;

    try {
      fileBuffer = await readFile(file.path);
    } catch {
      res.status(400).json({
        error: "Uploaded file could not be read",
      });
      return;
    }

    if (!fileBuffer.subarray(0, 5).equals(PDF_MAGIC_BYTES)) {
      res.status(400).json({
        error: "File is not a valid PDF",
      });
      return;
    }

    let pageCount: number;

    try {
      pageCount = await getPdfPageCount(fileBuffer);
    } catch {
      res.status(400).json({
        error: "File is not a valid PDF",
      });
      return;
    }

    if (pageCount < 1) {
      res.status(400).json({
        error: "PDF contains no pages",
      });
      return;
    }

    if (pageCount > MAX_PAGES) {
      res.status(400).json({
        error: `PDF cannot contain more than ${MAX_PAGES} pages`,
      });
      return;
    }

    const ownerId = req.user!.userId;

    const documentRecord = await DocumentModel.create({
      title,
      totalPages: 0,
      coverImageKey: null,
      ownerId,
      status: "processing",
    });

    documentId = documentRecord.id as string;

    const pages = await renderAllPdfPages(file.path);

    if (
      pages.length === 0 ||
      pages.length > MAX_PAGES ||
      pages.length !== pageCount
    ) {
      throw new Error(
        `Rendered page count (${pages.length}) does not match validated page count (${pageCount})`,
      );
    }

    for (const page of pages) {
      const objectPath = pageObjectPath(documentId, page.pageNumber);

      await uploadObject(objectPath, page.buffer, "image/png");

      uploadedPaths.push(objectPath);
    }

    documentRecord.totalPages = pages.length;

    documentRecord.coverImageKey = pageObjectPath(documentId, 1);

    documentRecord.status = "ready";

    await documentRecord.save();

    res.status(201).json({
      id: documentRecord.id,
      title: documentRecord.title,
      totalPages: documentRecord.totalPages,
      status: documentRecord.status,
      createdAt: documentRecord.createdAt,
    });
  } catch (error: unknown) {
    if (documentId) {
      await DocumentModel.findByIdAndUpdate(documentId, {
        $set: {
          status: "failed",
        },
      }).catch(() => undefined);
    }

    await removeObjects(uploadedPaths).catch(() => undefined);

    console.error(
      documentId
        ? `Document processing failed for ${documentId}:`
        : "Document creation failed:",
      error,
    );

    res.status(documentId ? 422 : 500).json({
      error: documentId ? "PDF processing failed" : "Failed to create document",
    });
  } finally {
    await unlink(file.path).catch(() => undefined);
  }
}

export async function listDocuments(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const role = req.user!.role;

  const documents = await DocumentModel.find({
    status: "ready",
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const locked = role !== "subscriber";

  res.json({
    documents: documents.map((doc) => ({
      id: doc._id,
      title: doc.title,
      totalPages: doc.totalPages,
      createdAt: doc.createdAt,
      locked,
    })),
  });
}
