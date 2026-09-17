import {
  Schema,
  model,
  Types,
  type Document as MongooseDocument,
} from "mongoose";

export type DocumentStatus = "processing" | "ready" | "failed";

export interface IDocumentRecord extends MongooseDocument {
  title: string;
  totalPages: number;
  coverImageKey: string | null;
  ownerId: Types.ObjectId;
  status: DocumentStatus;
  createdAt: Date;
}

const documentSchema = new Schema<IDocumentRecord>({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
  },

  totalPages: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },

  coverImageKey: {
    type: String,
    default: null,
  },

  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: ["processing", "ready", "failed"],
    default: "processing",
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

// Named DocumentModel (not "Document") to avoid colliding with Mongoose's
// own Document type and the global DOM Document type.
export const DocumentModel = model<IDocumentRecord>("Document", documentSchema);
