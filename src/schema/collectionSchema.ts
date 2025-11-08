import { gql } from "graphql-tag";

export const collectionSchema = gql`
  type Collection {
    id: Int!
    name: String!
    description: String
    isPublic: Boolean!
    createdAt: String!
    updatedAt: String!
    user: User!
    movies: [CollectionMovie!]!
    movieCount: Int!
  }

  type CollectionMovie {
    id: Int!
    tmdbId: Int!
    addedAt: String!
    movie: Movie # Fetched from TMDB
  }

  extend type Query {
    # Get all collections for the authenticated user
    collections: [Collection!]!

    # Get a single collection by ID (must be owner or public)
    getCollection(id: Int!): Collection
  }

  extend type Mutation {
    # Create a new collection (requires authentication)
    createCollection(name: String!, description: String, isPublic: Boolean): Collection!

    # Update a collection (requires authentication, must be owner)
    updateCollection(
      id: Int!
      name: String
      description: String
      isPublic: Boolean
    ): Collection!

    # Delete a collection (requires authentication, must be owner)
    deleteCollection(id: Int!): Boolean!

    # Add a movie to a collection (requires authentication, must be owner)
    addMovieToCollection(collectionId: Int!, tmdbId: Int!): CollectionMovie!

    # Remove a movie from a collection (requires authentication, must be owner)
    removeMovieFromCollection(collectionId: Int!, tmdbId: Int!): Boolean!
  }
`;

