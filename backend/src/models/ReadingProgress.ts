import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const readingProgressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },

    currentPage: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
);

readingProgressSchema.index({ userId: 1, documentId: 1 }, { unique: true });

export type ReadingProgressDocument = InferSchemaType<
  typeof readingProgressSchema
> & {
  _id: Types.ObjectId;
};

export const ReadingProgress = model("ReadingProgress", readingProgressSchema);
