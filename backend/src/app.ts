import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import multer from "multer";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { globalApiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { InvalidPdfUploadError } from "./middleware/upload.middleware.js";

function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: "Route not found",
  });
}

function getErrorProperty(error: unknown, property: string): unknown {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if (!(property in error)) {
    return undefined;
  }

  return (error as Record<string, unknown>)[property];
}

function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  if (error instanceof InvalidPdfUploadError) {
    res.status(400).json({
      error: error.message,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: "Uploaded file exceeds the maximum allowed size",
      LIMIT_FILE_COUNT: "Only one file can be uploaded at a time",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field",
      LIMIT_PART_COUNT: "Too many multipart form fields",
      LIMIT_FIELD_KEY: "Multipart field name is too long",
      LIMIT_FIELD_VALUE: "Multipart field value is too long",
      LIMIT_FIELD_COUNT: "Too many multipart fields",
    };

    res.status(400).json({
      error: messages[error.code] ?? "Invalid multipart upload",
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: "Request contains invalid data",
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: "Request contains an invalid value",
    });
    return;
  }

  if (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  ) {
    res.status(409).json({
      error: "A record with the same unique value already exists",
    });
    return;
  }

  const errorStatus = getErrorProperty(error, "status");

  const errorType = getErrorProperty(error, "type");

  if (errorStatus === 413 || errorType === "entity.too.large") {
    res.status(413).json({
      error: "Request body is too large",
    });
    return;
  }

  if (errorType === "entity.parse.failed" || error instanceof SyntaxError) {
    res.status(400).json({
      error: "Invalid JSON body",
    });
    return;
  }

  console.error("Unhandled request error:", error);

  res.status(500).json({
    error: "Internal server error",
  });
}

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
      optionsSuccessStatus: 204,
    }),
  );

  app.use(
    express.json({
      limit: "1mb",
    }),
  );

  app.use("/api", globalApiRateLimiter);

  app.use("/api/health", healthRoutes);

  app.use("/api/auth", authRoutes);

  app.use("/api/subscription", subscriptionRoutes);

  app.use("/api/documents", documentsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
