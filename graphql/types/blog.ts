import mongoose, { Document } from "mongoose"


export interface Iblog extends Document {
    creator:mongoose.Types.ObjectId,
    coverImage:mongoose.Types.ObjectId,
    tags?:[string],
    heading:string,
    content:string,
    externalLinks?:[{
        link:string,
        linkTitle?:string
    }],
    visitors:[{
        user:mongoose.Types.ObjectId,
        visitedAt?:Date
    }],
    views:[{
        user:mongoose.Types.ObjectId,
        viewedAt?:Date
    }],
    viewsCount:number,
    visitorsCount:number
}

export interface inputCreateBlog{
    creator:string,
    coverImage:string,
    tags?:[string],
    heading:string,
    content:string,
    externalLinks?:[{
        link:string,
        linkTitles?:string
    }]
}