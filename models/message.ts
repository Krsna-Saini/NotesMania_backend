import mongoose from "mongoose";
import { IMessage } from "../graphql/types/messageTypes";


const messageSchema = new mongoose.Schema<IMessage>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    content: { type: String }, 
    type: {
      type: String,
      enum: ["text", "critical"], 
      required: true,
    },
    ReplyOf:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Message"
    },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attachment" }], 
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>("Message", messageSchema);
