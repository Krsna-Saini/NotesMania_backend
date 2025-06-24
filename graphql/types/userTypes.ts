import { Document, Types } from "mongoose";

  
// User Group Type
export interface IUserGroup {
  group: Types.ObjectId;
  joinedAt: Date;
  lastSeen?: Date;
}
interface UserProfile {
  userId:string;
  username?: string;
  profileImageUrl?: string;
  description?: string;
}
export interface IUserUpdateProfile{
  input:UserProfile
}
// User Document Type
export interface IUserDocument extends Document {
  username: string;
  email: string;
  password?: string;
  profileImageUrl?: string;
  groups: IUserGroup[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// GraphQL Context Type
export interface IContext {
  user?: IUserDocument;
}

// Input Types
export interface ICreateUserInput {
  username: string;
  email: string;
  password: string;
  profileImageUrl?: string;
  description?: string;
}

export interface IUpdateUserInput {
  username?: string;
  email?: string;
  profileImageUrl?: string;
  description?: string;
}

// Resolver Types
export interface IUserGroupParent {
  group: Types.ObjectId;
  joinedAt: Date;
  lastSeen?: Date;
}

export interface IGetUserArgs {
  id: string;
}

export interface ICreateUserArgs {
  input: ICreateUserInput;
}

export interface IUpdateUserArgs {
  id: string;
  input: IUpdateUserInput;
}

export interface IDeleteUserArgs {
  id: string;
}

export interface IAddUserToGroupArgs {
  userId: string;
  groupId: string;
}