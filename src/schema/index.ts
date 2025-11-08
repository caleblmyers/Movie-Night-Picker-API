import { gql } from "graphql-tag";
import { movieSchema } from "./movieSchema";
import { personSchema } from "./personSchema";
import { authSchema } from "./authSchema";
import { userSchema } from "./userSchema";

/**
 * Base schema with Query and Mutation types
 */
const baseSchema = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

/**
 * Combine all schema definitions
 * Using extend type allows us to split the schema across multiple files
 */
export const typeDefs = [
  baseSchema,
  movieSchema,
  personSchema,
  authSchema,
  userSchema,
];
