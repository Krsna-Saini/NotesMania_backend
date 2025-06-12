import mongoose, { Document, Schema } from "mongoose";
import { IGroupDocument } from "../graphql/types/groupTypes";

const groupSchema = new Schema<IGroupDocument>(
  {
    name: { type: String, required: true },
    profilePicture: { type: String },
    description: { type: String },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    admins: [
      {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        promotedAt: { type: Date, default: Date.now },
      },
    ],

    members: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["member", "leader", "admin"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    messages: [{
      message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    }],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    announcements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attachment" }],

    inviteRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
        invitedAt: { type: Date, default: Date.now },
      },
    ],
    links: [
      {
        link: {
          type: String,
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model<IGroupDocument>("Group", groupSchema);
