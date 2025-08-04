import mongoose,{Document} from "mongoose";

export interface IComment extends Document{
    user: mongoose.Schema.Types.ObjectId;
    comment: string;
    replies?: mongoose.Schema.Types.ObjectId[];
    createdAt?: Date;
}