import express, { type Express } from "express";
import cors from "cors";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import documentsRoutes from "./routes/documents.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/documents", documentsRoutes);

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
