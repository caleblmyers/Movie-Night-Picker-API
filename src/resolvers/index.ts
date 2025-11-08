import { movieResolvers } from "./movieResolvers";
import { personResolvers } from "./personResolvers";
import { authResolvers } from "./authResolvers";
import { userResolvers } from "./userResolvers";
import { fieldResolvers } from "./fieldResolvers";

/**
 * Combine all resolvers into a single resolver map
 */
export const resolvers = {
  Query: {
    ...movieResolvers.Query,
    ...personResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
  },
  ...fieldResolvers,
};
