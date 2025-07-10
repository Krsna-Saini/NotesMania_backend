import mongoose from "mongoose"
import { Iblog } from "../graphql/types/blog"
const blog = new mongoose.Schema<Iblog>({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    coverImage: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Attachment",
        required:true
    },
    tags: [String],
    heading: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true
    },
    externalLinks: [
        {
            link: { type: String },
            linkTitle: { type: String }
        }
    ],
    visitors: [
        {
            user: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "User", 
                required: true 
            },
            visitedAt: { type: Date, default: Date.now }
        }
    ],
    views:[
          {
            user: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "User", 
                required: true 
            },
            viewedAt: { type: Date, default: Date.now }
        }  
    ]
}, { timestamps: true })

export default mongoose.model<Iblog>("Blog", blog)