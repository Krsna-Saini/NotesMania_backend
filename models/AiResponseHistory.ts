import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  selectedText?: string | null;
  timestamp?: Date;
  error?: boolean;
}

export interface IAiResponseHistory {
  name: string;
  User: mongoose.Types.ObjectId;
  Messages: IMessage[];
}

export interface IAiResponseHistoryDocument extends IAiResponseHistory, Document {}

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    selectedText:{
      type: String,
      default: null,
    },
    error:{
      type: Boolean,
      default: false,
    }
  },
  { _id: false }
);

const AiResponseHistorySchema = new Schema<IAiResponseHistoryDocument>(
  {
    name: {
      type: String,
      required: true,
      default: 'New chat',
    },
    User: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    Messages: [MessageSchema],
  },
  { timestamps: true }
);

const AiResponseHistory = mongoose.model<IAiResponseHistoryDocument>('AiResponseHistory', AiResponseHistorySchema);

export default AiResponseHistory;
