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
  enum MatchField {
    content
    selectedText
  }

  enum MessageRole {
    user
    assistant
  }
  type SearchMatch {
  _id: ID!            
  name: String!     
  role: MessageRole 
  timestamp: DateTime
  matchedField: MatchField!
  matchedLine: String!  
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
    searchChat(query:String!,userId:String!):[SearchMatch!]
    appendMessage(chatId: ID!, message: AiMessageInput!): AiResponseHistory!
    deleteChat(chatId: ID!): Boolean
  }
`;

export default AiResponsetypeDefs;
