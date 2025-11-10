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
    # Analytics and insights about the collection
    insights: CollectionInsights!
  }

  type CollectionInsights {
    # Total number of movies in the collection
    totalMovies: Int!
    # Number of unique genres
    uniqueGenres: Int!
    # Breakdown of movies by genre
    moviesByGenre: [GenreCount!]!
    # Number of unique keywords
    uniqueKeywords: Int!
    # Top keywords by number of movies
    topKeywords: [KeywordCount!]!
    # Number of unique actors
    uniqueActors: Int!
    # Top actors by number of movies
    topActors: [PersonCount!]!
    # Number of unique directors/writers
    uniqueCrew: Int!
    # Top directors/writers by number of movies
    topCrew: [PersonCount!]!
    # Year range of movies
    yearRange: YearRange
    # Average runtime
    averageRuntime: Float
    # Average vote average
    averageVoteAverage: Float
  }

  type KeywordCount {
    keyword: Keyword!
    count: Int!
  }

  type GenreCount {
    genre: Genre!
    count: Int!
  }

  type PersonCount {
    person: Person!
    count: Int!
  }

  type YearRange {
    min: Int!
    max: Int!
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

    # Get insights/analytics for a collection
    collectionInsights(collectionId: Int!): CollectionInsights!

    # Get collection analysis (top genres, keywords, actors) for filtering
    # Returns top items that can be used to filter search/shuffle/suggest/discover
    collectionAnalysis(collectionId: Int!, limit: Int): CollectionAnalysis!
  }

  type CollectionAnalysis {
    # Top genres from the collection
    topGenres: [Genre!]!
    # Top keywords from the collection
    topKeywords: [Keyword!]!
    # Top actors from the collection
    topActors: [Person!]!
    # Top crew (directors/writers) from the collection
    topCrew: [Person!]!
    # Year range from the collection
    yearRange: YearRange
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

