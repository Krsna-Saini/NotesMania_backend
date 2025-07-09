import { gql } from "apollo-server-express";

export const blogTypeDefs = gql`
  type ExternalLink {
    link: String
    linkTitle: String
  }

  type BlogVisitor {
    user: User!
    visitedAt: String!
  }

  type Blog {
    _id: ID!
    creator: User!
    coverImage: Attachment!
    tags: [String!]
    heading: String!
    content: String!
    externalLinks: [ExternalLink]
    visitors: [BlogVisitor]
    createdAt: String!
    updatedAt: String!
  }

  input ExternalLinkInput {
    link: String
    linkTitle: String
  }

  input inputCreateBlog {
    creator: ID!
    coverImage: ID!
    tags: [String]
    heading: String!
    content: String!
    externalLinks: [ExternalLinkInput]
  }

  type MessageResponse {
    message: String!
  }

  type Query {
    getBlogs: [Blog!]!
    getBlogsByUser(userId: ID!): [Blog!]!
  }

  type Mutation {
    createBlog(
      creator: ID!
      coverImage: ID!
      tags: [String]
      heading: String!
      content: String!
      externalLinks: [ExternalLinkInput]
    ): Blog!

    handleVisitor(visitor: ID!, blogId: ID!): Blog!
    handleDeleteBlog(blogId: ID!): MessageResponse!
  }
`;
