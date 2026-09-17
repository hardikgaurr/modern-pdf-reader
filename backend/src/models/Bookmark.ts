import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const bookmarkSchema = new Schema(
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

    pageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
);

bookmarkSchema.index(
  { userId: 1, documentId: 1, pageNumber: 1 },
  { unique: true },
);

export type BookmarkDocument = InferSchemaType<typeof bookmarkSchema> & {
  _id: Types.ObjectId;
};

export const Bookmark = model("Bookmark", bookmarkSchema);
