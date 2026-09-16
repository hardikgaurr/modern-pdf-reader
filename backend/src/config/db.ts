import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed");

    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exit(1);
  }
}
