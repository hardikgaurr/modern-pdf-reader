import mongoose from "mongoose";
import type { Response } from "express";

import type { AuthRequest } from "../middleware/auth.middleware.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";

interface SubscriptionBody {
  name?: unknown;
  avatar?: unknown;
  phone?: unknown;
  company?: unknown;
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must not exceed ${maxLength} characters`);
  }

  return normalized;
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must not exceed ${maxLength} characters`);
  }

  return normalized;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof mongoose.mongo.MongoServerError && error.code === 11000
  );
}

export async function subscribe(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const body = req.body as SubscriptionBody;

  let name: string;
  let avatar: string | null;
  let phone: string;
  let company: string;

  try {
    name = normalizeRequiredString(body.name, "Name", 120);
    phone = normalizeRequiredString(body.phone, "Phone", 30);
    company = normalizeRequiredString(body.company, "Company", 150);
    avatar = normalizeOptionalString(body.avatar, "Avatar", 500);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Invalid subscription data";

    res.status(400).json({
      error: message,
    });
    return;
  }

  const session = await mongoose.startSession();

  try {
    let responseBody:
      | {
          message: string;
          subscription: {
            id: string;
            name: string;
            avatar: string | null;
            phone: string;
            email: string;
            company: string;
            subscribedAt: Date;
          };
          user: {
            id: string;
            name: string | null;
            avatar: string | null;
            phone: string | null;
            email: string;
            company: string | null;
            role: "subscriber";
          };
        }
      | undefined;

    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);

      if (!user) {
        throw new SubscriptionControllerError("User not found", 404);
      }

      if (user.role === "admin") {
        throw new SubscriptionControllerError(
          "Administrators cannot subscribe",
          400,
        );
      }

      if (user.role === "subscriber") {
        throw new SubscriptionControllerError(
          "User is already subscribed",
          409,
        );
      }

      const existingSubscription = await Subscription.findOne({
        userId: user._id,
      }).session(session);

      if (existingSubscription) {
        throw new SubscriptionControllerError(
          "Subscription already exists for this user",
          409,
        );
      }

      const [subscription] = await Subscription.create(
        [
          {
            userId: user._id,
            name,
            avatar,
            phone,
            email: user.email,
            company,
          },
        ],
        { session },
      );

      if (!subscription) {
        throw new Error("Failed to create subscription record");
      }

      user.name = name;
      user.avatar = avatar;
      user.phone = phone;
      user.company = company;
      user.role = "subscriber";

      await user.save({ session });

      responseBody = {
        message: "Subscription activated successfully",
        subscription: {
          id: subscription.id,
          name: subscription.name,
          avatar: subscription.avatar,
          phone: subscription.phone,
          email: subscription.email,
          company: subscription.company,
          subscribedAt: subscription.subscribedAt,
        },
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          phone: user.phone,
          email: user.email,
          company: user.company,
          role: "subscriber",
        },
      };
    });

    if (!responseBody) {
      res.status(500).json({
        error: "Subscription could not be completed",
      });
      return;
    }

    res.status(201).json(responseBody);
  } catch (error: unknown) {
    if (error instanceof SubscriptionControllerError) {
      res.status(error.statusCode).json({
        error: error.message,
      });
      return;
    }

    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        error: "Subscription already exists for this user",
      });
      return;
    }

    console.error("Subscription transaction failed:", error);

    res.status(500).json({
      error: "Subscription could not be completed",
    });
  } finally {
    await session.endSession();
  }
}

class SubscriptionControllerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SubscriptionControllerError";
  }
}
