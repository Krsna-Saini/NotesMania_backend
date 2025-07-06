import Queries from "../../../models/Queries"
import user from "../../../models/user";
export const queryResolver = {
    Query:{
        getQueries:async(_:unknown)=>{

            const queries=await Queries.find()
            .populate({
                path:"User",
                model:"User",
                select:"id username email profileImageUrl"
            })

            return queries;
        }
    },
    Mutation:{
        CreateQuery:async(_:unknown,{userId,Question}:{
            userId:string,
            Question:string,
        })=>{

            // checking if data is received correctly
            if(!userId || !Question)throw Error("Invaid Data")

            const User=await user.findById(userId)

            // sending error if User not found
            if(!User)throw Error("User not found")
            
            const Query=new Queries({
                User:userId,
                Question:Question
            })
            
            return (await Query.save()).populate("User")
        }
    }
}