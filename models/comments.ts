import mongoose from "mongoose";
import { IComment } from "../graphql/types/comment";
const commentSchema = new mongoose.Schema<IComment>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    replies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IComment>('Comment', commentSchema);