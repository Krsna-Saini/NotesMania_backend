import { gql } from "apollo-server-express";

export const blogTypeDefs = gql`
  scalar Date

  type ExternalLink {
    link: String
    linkTitle: String
  }

  type BlogVisitor {
    user: User!
    visitedAt: String!
  }

  type BlogViews {
    user: User!
    viewedAt: String!
  }

  type Attachment {
    _id: ID!
    fileUrl: String!
  }

  type Comment {
    _id: ID!
    user: User!
    comment: String!
    replies: [Comment!]
    likes:[ID]
    dislikes:[ID]
    createdAt: Date!
    updatedAt: Date!
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
    views: [BlogViews]
    comments: [Comment!]
    createdAt: Date!
    updatedAt: Date!
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
    getBlogs(page: Int, query: String): PaginatedBlogs
    getBlogsByUser(userId: ID!): [Blog!]!
    getBlogById(blogId: ID!): Blog
    getComments(blogId: ID!): [Comment!]!
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
    handleLike(commentId: ID!, userId: ID!): String!
    handleDeslike(commentId: ID!, userId: ID!): String!
    addComment(blogId: ID!, userId: ID!, comment: String!): String!
    addReply(commentId: ID!, userId: ID!, reply: String!): String!
    deleteComment(commentId: ID!): String!
    deleteReply(parentCommentId: ID!, replyCommentId: ID!): String!
  }
`;
