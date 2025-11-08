import { gql } from "graphql-tag";

export const userSchema = gql`
  type User {
    id: Int!
    email: String!
    name: String!
    createdAt: String!
    savedMovies: [SavedMovie!]!
    ratings: [Rating!]!
    reviews: [Review!]!
    collections: [Collection!]!
  }

  type SavedMovie {
    id: Int!
    tmdbId: Int!
    createdAt: String!
    movie: Movie # Fetched from TMDB
    # User's rating and review for this movie (requires authentication, returns null if not rated/reviewed)
    rating: Rating
    review: Review
  }

  type Rating {
    id: Int!
    tmdbId: Int!
    value: Int!
    createdAt: String!
    updatedAt: String!
    movie: Movie # Fetched from TMDB
    user: User! # User who gave the rating
  }

  type Review {
    id: Int!
    tmdbId: Int!
    content: String!
    createdAt: String!
    updatedAt: String!
    movie: Movie # Fetched from TMDB
    user: User! # User who wrote the review
  }

  extend type Query {
    # User profile and saved movies (requires authentication)
    me: User
    savedMovies: [SavedMovie!]!
    ratings: [Rating!]!
    reviews: [Review!]!
  }

  extend type Mutation {
    # Save a movie (requires authentication)
    saveMovie(tmdbId: Int!): SavedMovie!

    # Remove a saved movie (requires authentication)
    unsaveMovie(tmdbId: Int!): Boolean!

    # Rate a movie (requires authentication)
    rateMovie(tmdbId: Int!, rating: Int!): Rating!

    # Update or create a review (requires authentication)
    reviewMovie(tmdbId: Int!, content: String!): Review!

    # Delete a review (requires authentication)
    deleteReview(tmdbId: Int!): Boolean!

    # Update user name (requires authentication)
    updateName(name: String!): User!
  }
`;
