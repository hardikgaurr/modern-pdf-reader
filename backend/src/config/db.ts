import mongoose from "mongoose";

import { env } from "./env.js";

export async function connectDB(
  mongoUri: string = env.mongodbUri,
): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`MongoDB connection failed: ${error.message}`, {
        cause: error,
      });
    }

    throw new Error("MongoDB connection failed");
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}
