import mongoose, { Document, Schema } from "mongoose";
import { IUserDocument } from "../graphql/types/userTypes";
const userSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String },
    groups: [
      {
        group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
        joinedAt: { type: Date, default: Date.now },
        lastSeen: { type: Date, default: Date.now },
      },
    ],
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUserDocument>("User", userSchema);
