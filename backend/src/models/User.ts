import bcrypt from "bcrypt";
import { Schema, model, type Document as MongooseDocument } from "mongoose";

export interface IUser extends MongooseDocument {
  email: string;
  passwordHash: string;
  role: "subscriber" | "free";
  subscriptionExpiresAt: Date | null;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["subscriber", "free"],
    default: "free",
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.comparePassword = function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser>("User", userSchema);
