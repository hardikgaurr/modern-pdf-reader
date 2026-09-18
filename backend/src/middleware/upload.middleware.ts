import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import multer from "multer";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export class InvalidPdfUploadError extends Error {
  constructor() {
    super("Only PDF files are allowed");
    this.name = "InvalidPdfUploadError";
  }
}

export const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpdir()),
    filename: (_req, file, cb) => {
      const ext =
        path.extname(file.originalname).toLowerCase() === ".pdf"
          ? ".pdf"
          : ".tmp";

      cb(null, `upload-${randomUUID()}${ext}`);
    },
  }),

  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },

  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new InvalidPdfUploadError());
      return;
    }

    cb(null, true);
  },
});
