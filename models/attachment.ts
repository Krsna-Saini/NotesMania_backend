import mongoose from "mongoose";
import { IAttachment } from "../graphql/types/attachmentTypes";

const attachmentSchema = new mongoose.Schema<IAttachment>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group"},
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  fileName: { type: String, required: true },
  tags:[{
    type:String,
  }],
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAttachment>("Attachment", attachmentSchema);
