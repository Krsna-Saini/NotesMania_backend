import { gql } from "apollo-server-express";

export const searchSchema = gql`
    
  union SearchResultData = User | Group | Attachment | Blog | Message | AiResponseHistory | Queries

  type SearchProgressPayload {
    type: String!       
    status: String!    
    data: [SearchResultData]
  }

  type Query {
    search(query: String!,userId:ID!): Boolean!
  }

  extend type Subscription {
    searchProgress: SearchProgressPayload
  }
`;