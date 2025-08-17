import { Types } from "mongoose";
export interface IMessage  {
    sender?: Types.ObjectId;
    group: Types.ObjectId;
    content?: string;
    type: "text" | "critical";
    attachments?: Types.ObjectId[];
    ReplyOf?:IMessage;
    createdAt: Date;
}
export interface IMessageInput  {
    senderId?: string;
    groupId: string;
    content?: string;
    ReplyOf?:string;
    type: "text" | "critical";
    attachments?: string[];
    createdAt: Date;
}