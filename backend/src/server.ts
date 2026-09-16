import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";

async function main(): Promise<void> {
  await connectDB();

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
