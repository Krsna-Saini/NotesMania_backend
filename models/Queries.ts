import mongoose from "mongoose"
import { IQuery } from "../graphql/types/queriesTypes"

const Query= new mongoose.Schema<IQuery>({
   Question:{
      type:String,
      required:true
   },
   User:{
      type:mongoose.Schema.Types.ObjectId ,
      required:true,
      ref:"User"
   }
})

export default mongoose.model<IQuery>("Query",Query)