import { gql } from "graphql-tag";

export const authSchema = gql`
  type AuthPayload {
    token: String!
    user: User!
  }

  extend type Mutation {
    # Authentication
    register(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;

