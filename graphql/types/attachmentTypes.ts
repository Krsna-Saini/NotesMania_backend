import mongoose from "mongoose";
export interface IAttachment extends Document {
  user: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  fileUrl: string;
  fileType: String;
  fileName: string;
  tags:[string]
  uploadedAt: Date;
}