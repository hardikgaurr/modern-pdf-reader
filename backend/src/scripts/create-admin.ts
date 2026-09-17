import "dotenv/config";

import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

async function main(): Promise<void> {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password || password.length < 8) {
    console.error(
      "Usage: npm run create-admin -- <email> <password (min 8 chars)>",
    );
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: { passwordHash, role: "admin" } },
    { upsert: true, new: true },
  );

  console.log(`Admin ready: ${user.email} (role=${user.role})`);
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error("Failed to create admin:", error);
  process.exit(1);
});
