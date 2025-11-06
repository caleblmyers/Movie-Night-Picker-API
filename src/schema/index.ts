import { gql } from "graphql-tag";

export const typeDefs = gql`
  type Movie {
    id: Int!
    title: String!
    overview: String
    posterUrl: String
    releaseDate: String
    voteAverage: Float
    voteCount: Int
  }

  type Person {
    id: Int!
    name: String!
    biography: String
    profileUrl: String
    birthday: String
    placeOfBirth: String
    knownForDepartment: String
    popularity: Float
  }

  input MoviePreferencesInput {
    genres: [String!]
    actors: [Int!]
    yearRange: [Int!]
  }

  type Query {
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

    # Get a single person by TMDB ID
    getPerson(id: Int!): Person

    # Search people by query string
    searchPeople(query: String!): [Person!]!

    # Get a completely random movie
    randomMovie: Movie

    # Get a completely random person
    randomPerson: Person
  }
`;
