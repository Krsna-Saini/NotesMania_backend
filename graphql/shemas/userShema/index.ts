import { gql } from "apollo-server-express";

export const userTypeDefs = gql`
  type UserGroup {
    group: Group!
    joinedAt: DateTime!
    lastSeen: DateTime
  }

  type User {
    id: ID!
    username: String!
    email: String!
    profileImageUrl: String
    groups: [UserGroup!]!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    profileImageUrl: String
    description: String
  }
  input UpdateProfileInput{
    userId:String!
    username: String
    AttchmentUrl: String
    description: String
  }
  type Query {
    getUser(id: String!): User
    getUsers: [User!]!
  }
  type Subscription{
    onlineUsers:[User!]!
  }
  type Mutation {
    authenticateUser(email: String!, password: String!): User!
    createUser(input: CreateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    userOnline(userId: ID!): User!
    userOffline(userId:ID!): User!
    searchUser(username:String!):[User!]!
    handleInviteRequest(groupId:String!,userId:String!):Boolean
    UpdateProfile(input:UpdateProfileInput):User!
  }

  scalar DateTime
`;