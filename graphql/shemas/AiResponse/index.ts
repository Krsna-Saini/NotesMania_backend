import { gql } from 'apollo-server-express';

const AiResponsetypeDefs = gql`
  type Message {
    role: String!
    content: String!
    selectedText: String
    timestamp: String!
    error: Boolean
  }

  type AiResponseHistory {
    _id: ID
    id: ID
    name: String!
    User: String!
    Messages: [Message!]!
    createdAt: String!
    updatedAt: String!
  }

  input AiMessageInput {
    role: String!
    content: String!
    selectedText: String
    error:Boolean
  }

  type Query {
    getAiHistoryByUser(userId: String!): [AiResponseHistory]
    getAiChatById(chatId: ID!): AiResponseHistory
  }

  type Mutation {
    addAiResponse(userId: String!, name: String): AiResponseHistory
    updateChatName(chatId: String!, name: String!): AiResponseHistory
    appendMessage(chatId: ID!, message: AiMessageInput!): AiResponseHistory
    deleteChat(chatId: ID!): Boolean
  }
`;

export default AiResponsetypeDefs;
