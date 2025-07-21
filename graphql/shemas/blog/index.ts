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
  type BlogViews {
    user:User!
    viewedAt:String!
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
    views:[BlogViews]
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
  
  type PaginatedBlogs {
    blogs: [Blog]
    currentPage: Int
    totalPages: Int
    totalBlogs: Int
    topViewed: [Blog]
    topVisited: [Blog]
  }

  type MessageResponse {
    message: String!
  }

  type Query {
    getBlogs(page:Int , query:String): PaginatedBlogs
    getBlogsByUser(userId: ID!): [Blog!]!
    getBlogById(blogId:ID!):Blog
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
