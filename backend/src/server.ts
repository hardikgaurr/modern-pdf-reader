import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import multer from "multer";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import documentsRoutes from "./routes/documents.routes.js";

function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: "Route not found",
  });
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

  if (error instanceof SyntaxError) {
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

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/documents", documentsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
