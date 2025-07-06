import { gql } from 'apollo-server-express';

export const messageTypedefs = gql`
  scalar Date

  type Subscription {
    messageSent(groupId: ID!): Message
  }

  type Attachment {
    user: User!
    group: Group 
    fileUrl: String!
    fileType: String!
    fileName: String!
    uploadedAt: Date!
  }

  type Message {
    _id: ID!
    sender: User!
    attachments: [Attachment]
    group: Group!
    content: String
    type: String!
    createdAt: Date!
  }

  input MessageInput {
    sender: ID!
    group: ID!
    content: String
    type: String!
    attachments: [String]
  }

  type Query {
    messages(groupId: ID!): [Message]
    message(messageId: ID!): Message
  }

  type Mutation {
    sendMessage(
      senderId: ID!
      groupId: ID!
      content: String
      type: String!
      attachments: [String]
    ): Message!
  }
`;
