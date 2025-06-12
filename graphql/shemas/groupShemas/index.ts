import { gql } from "apollo-server-express";

export const groupTypeDefs = gql`
  scalar DateTime
  
  type User {
    id: ID!
    username: String!
    email: String!
    profilePicture: String
  }

  type Member {
    member: User!
    status: String!
    joinedAt: DateTime!
  }
  
  type Admin {
    admin: User!
    promotedAt: DateTime!
  }

  type GroupMessage {
    message: Message!
  }
  type Links {
    link:String
    id: ID!
  }

  type Attachment {
    id: ID!
    url: String!
    type: String!
  }

  type Group {
    id: ID!
    name: String!
    description: String
    profilePicture: String
    leader: User!
    members: [Member!]!
    admins: [Admin!]!
    messages: [GroupMessage!]!
    pinnedMessages: [Message!]!
    announcements: [Message!]!
    attachments: [Attachment!]!
    inviteRequests: [InviteRequest!]!
    links:[Links]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type InviteRequest {
    user: User!
    status: String!
    invitedAt: DateTime!
  }

  input IAddMemberInput {
    groupId: ID!
    userId: ID!
  }

  extend type Query {
    getGroup(groupId: ID!): Group
    listGroups: [Group!]!
  }

  type Subscription {
    typingUser(groupId: ID!): [ID!]!
  }

  extend type Mutation {
    createGroup(
      name: String!
      leader: String!
      description: String
    ): Group!
    addMember(input: IAddMemberInput!): Group!
    promoteAdmin(groupId: String!, userId: String!): Group!
    demoteAdmin(groupId: String!, userId: String!): Group!
    removeMember(groupId: String!, userId: String!): Group!
    userTyping(userId: ID!, groupId: ID!): [ID!]!
    userStoppedTyping(userId: ID!, groupId: ID!): [ID!]!
    getAttachments(groupId: ID!): [Attachment!]!
    searchGroups(groupName: String!):[Group!]!
    acceptInviteRequest(groupId: String!, userId: String!): Boolean!
    rejectInviteRequest(groupId: String!, userId: String!): Boolean!
  }
`;