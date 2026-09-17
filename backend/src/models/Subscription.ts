import {
  Schema,
  model,
  type Document as MongooseDocument,
  type Types,
} from "mongoose";

export interface ISubscription extends MongooseDocument {
  userId: Types.ObjectId;
  name: string;
  avatar: string | null;
  phone: string;
  email: string;
  company: string;
  subscribedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },

  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
  },

  avatar: {
    type: String,
    trim: true,
    default: null,
  },

  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 255,
  },

  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },

  subscribedAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

export const Subscription = model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
