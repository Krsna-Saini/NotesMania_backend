import mongoose,{ Document } from "mongoose";

export interface IQuery extends Document {
   Question:string,
   User:mongoose.Schema.Types.ObjectId,
}