import { Document, Types } from "mongoose";
import mongoose from "mongoose";

interface IGroupMember {
  member: mongoose.Types.ObjectId;
  joinedAt: Date;
  status:"leader" | "admin" | "member" ;
}

interface IAdmin {
  admin: mongoose.Types.ObjectId;
  promotedAt: Date;
}
interface message {
  message:mongoose.Types.ObjectId
}

interface IInviteRequest {
  user: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  invitedAt?: Date;
}
export interface IGroupDocument extends Document {
    
    name: string;
    description?: string;
    profilePicture?: string;
    leader: mongoose.Types.ObjectId;
    admins: IAdmin[];
    members: IGroupMember[];
    messages: message[];
    pinnedMessages: mongoose.Types.ObjectId[];
    announcements: mongoose.Types.ObjectId[];
    attachments: mongoose.Types.ObjectId[];
    inviteRequests: IInviteRequest[];
    links:{link:string}[]
    createdAt: Date;
    updatedAt: Date;
}
export interface IGetGroupArgs {
  groupId: Types.ObjectId
}
export interface ICreateGroupInput {
  name: string;
  description?: string;
}

export interface IUpdateGroupInput {
  name?: string;
  description?: string;
}
export interface IAddMemberInput {
  groupId: string;
  userId: string;
}
export interface IRemoveMemberInput {
  userId: Types.ObjectId;
}
export interface ICreateGroupInput {
  name: string;
  description?: string;
  leader: mongoose.Types.ObjectId;
}
