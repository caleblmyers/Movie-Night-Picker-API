import { gql } from "graphql-tag";

export const movieSchema = gql`
  type Movie {
    id: Int!
    title: String!
    overview: String
    posterUrl: String
    releaseDate: String
    voteAverage: Float
    voteCount: Int
    # User-specific data (requires authentication, returns null if not authenticated or no data)
    rating: Rating
    review: Review
    isSaved: Boolean!
    inCollections: [Collection!]!
    # All reviews and ratings for this movie
    reviews: [Review!]!
    ratings: [Rating!]!
    averageUserRating: Float
  }

  input MoviePreferencesInput {
    genres: [String!]
    actors: [Int!]
    yearRange: [Int!]
  }

  extend type Query {
    # Get a single movie by TMDB ID
    getMovie(id: Int!): Movie

    # Search movies by query string
    searchMovies(query: String!): [Movie!]!

    # Discover movies with filters
    discoverMovies(
      genres: [String!]
      yearRange: [Int!]
      cast: [Int!]
    ): [Movie!]!

    # Suggest a movie based on user selections (genres, actors, year range)
    # Returns a single random movie matching the criteria
    # All parameters are optional - can be called with any combination
    suggestMovie(preferences: MoviePreferencesInput): Movie

    # Shuffle/random movie (uses discover and returns one random result)
    # Accepts optional genres, yearRange, and cast members (actors)
    # If no results with multiple genres/cast, tries again with only one of each
    shuffleMovie(genres: [String!], yearRange: [Int!], cast: [Int!]): Movie

    # Get a completely random movie
    randomMovie: Movie
  }
`;

