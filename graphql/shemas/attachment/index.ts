import { gql } from 'apollo-server-express';

const AttachmentDefs = gql`
 scalar DateTime

type User {
  _id: ID!
  username: String!
  profileImageUrl: String
}

type GroupMember {
  _id: ID!
  username: String!
  profileImageUrl: String
}

type GroupSummary {
  name: String
  totalMembers: Int
  sampleMembers: [GroupMember]
}

type Attachment {
  _id: ID!
  fileUrl: String!
  fileName: String!
  fileType: String!
  tags: [String]
  uploadedAt:Date
  uploadedBy: User!
  Att_group: GroupSummary
}
input CreateAttachmentInput {
  user: ID!
  group: ID
  fileUrl: String!
  fileType: String!
  fileName: String!
  tags: [String!]
}

type Query {
  getAttachments(userId: ID!): [Attachment!]!
}
`;

export default AttachmentDefs;
