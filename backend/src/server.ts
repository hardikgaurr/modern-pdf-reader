import { createServer } from "node:http";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { startEphemeralCleanup } from "./services/ephemeral-cleanup.service.js";

async function main(): Promise<void> {
  await connectDB();

  startEphemeralCleanup();

  const app = createApp();

  const server = createServer(app);

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await disconnectDB();

        console.log("Shutdown completed successfully");

        process.exit(0);
      } catch (error: unknown) {
        console.error("Shutdown failed:", error);

        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout");

      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);

  process.exit(1);
});
