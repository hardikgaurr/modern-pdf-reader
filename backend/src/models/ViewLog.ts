import {
  Schema,
  model,
  Types,
  type Document as MongooseDocument,
} from "mongoose";

export interface IViewLog extends MongooseDocument {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  pageNumber: number;
  timestamp: Date;
}

const viewLogSchema = new Schema<IViewLog>({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: "Document",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  pageNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

// Write-only from the application's perspective — no update/delete routes
// are ever exposed for this collection.
export const ViewLog = model<IViewLog>("ViewLog", viewLogSchema);
