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
  }

  type SavedMovie {
    id: Int!
    tmdbId: Int!
    createdAt: String!
    movie: Movie # Fetched from TMDB
  }

  type Rating {
    id: Int!
    tmdbId: Int!
    rating: Int!
    createdAt: String!
    updatedAt: String!
    movie: Movie # Fetched from TMDB
  }

  type Review {
    id: Int!
    tmdbId: Int!
    content: String!
    createdAt: String!
    updatedAt: String!
    movie: Movie # Fetched from TMDB
  }

  extend type Query {
    # User profile and saved movies (requires authentication)
    me: User
    mySavedMovies: [SavedMovie!]!
    myRatings: [Rating!]!
    myReviews: [Review!]!
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

