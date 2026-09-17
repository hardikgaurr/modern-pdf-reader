import bcrypt from "bcrypt";
import { Schema, model, type Document as MongooseDocument } from "mongoose";

export type UserRole = "admin" | "subscriber" | "free";

export interface IUser extends MongooseDocument {
  name: string | null;
  avatar: string | null;
  phone: string | null;
  company: string | null;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    trim: true,
    minlength: 1,
    maxlength: 120,
    default: null,
  },

  avatar: {
    type: String,
    trim: true,
    default: null,
  },

  phone: {
    type: String,
    trim: true,
    maxlength: 30,
    default: null,
  },

  company: {
    type: String,
    trim: true,
    maxlength: 150,
    default: null,
  },

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
    enum: ["admin", "subscriber", "free"],
    default: "free",
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

userSchema.methods.comparePassword = function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser>("User", userSchema);
