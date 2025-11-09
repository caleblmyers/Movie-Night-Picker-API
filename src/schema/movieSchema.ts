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
    # Runtime in minutes (if available)
    runtime: Int
    # Genres (if available)
    genres: [Genre!]!
    # Trailer information (if available)
    trailer: MovieTrailer
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
    genres: [Int!]
    actors: [Int!]
    crew: [Int!]
    yearRange: [Int!]
    mood: String
    era: String
    options: TMDBOptionsInput
  }

  input TMDBOptionsInput {
    # ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA")
    region: String
    # ISO 639-1 language code with optional region (e.g., "en-US", "es-ES")
    language: String
    # Sort option (e.g., "popularity.desc", "release_date.desc", "vote_average.desc")
    sortBy: String
    # Page number for pagination (default: 1)
    page: Int
    # Filter by release year
    year: Int
    # Filter by primary release year
    primaryReleaseYear: Int
    # Minimum vote average (0-10)
    voteAverageGte: Float
    # Minimum vote count
    voteCountGte: Int
    # Filter by original language (ISO 639-1 code)
    withOriginalLanguage: String
    # Filter by watch providers (comma-separated provider IDs)
    withWatchProviders: String
    # Include adult content (default: false)
    includeAdult: Boolean
  }

  extend type Query {
    # Get a single movie by TMDB ID
    getMovie(id: Int!, options: TMDBOptionsInput): Movie

    # Search movies by query string
    searchMovies(query: String!, options: TMDBOptionsInput): [Movie!]!

    # Discover movies with filters
    # cast: Only actors (filtered automatically)
    # crew: Only directors/writers (filtered automatically)
    discoverMovies(
      genres: [Int!]
      yearRange: [Int!]
      cast: [Int!]
      crew: [Int!]
      options: TMDBOptionsInput
    ): [Movie!]!

    # Suggest a movie based on user selections (genres, actors, year range)
    # Returns a single random movie matching the criteria
    # All parameters are optional - can be called with any combination
    suggestMovie(preferences: MoviePreferencesInput): Movie

    # Shuffle/random movie (uses discover and returns one random result)
    # Accepts optional genres (as IDs), yearRange, cast (actors), crew (directors/writers),
    # minVoteAverage, minVoteCount, runtimeRange, and originalLanguage
    # Returns null if no movies match the criteria
    shuffleMovie(
      genres: [Int!]
      yearRange: [Int!]
      cast: [Int!]
      crew: [Int!]
      minVoteAverage: Float
      minVoteCount: Int
      runtimeRange: [Int!]
      originalLanguage: String
    ): Movie

    # Get a completely random movie
    randomMovie(options: TMDBOptionsInput): Movie

    # Get trending movies
    # timeWindow: "day" or "week" (default: "day")
    trendingMovies(
      timeWindow: TrendingTimeWindow
      options: TMDBOptionsInput
    ): [Movie!]!

    # Get movies currently playing in theaters
    nowPlayingMovies(options: TMDBOptionsInput): [Movie!]!

    # Get popular movies
    popularMovies(options: TMDBOptionsInput): [Movie!]!

    # Get top rated movies
    topRatedMovies(options: TMDBOptionsInput): [Movie!]!

    # Get available movie genres
    movieGenres: [Genre!]!

    # Get actors from top rated, popular, and now playing movies
    # Returns unique actors from the first page of each list
    actorsFromFeaturedMovies(options: TMDBOptionsInput): [Person!]!

    # Get directors/writers from top rated, popular, and now playing movies
    # Returns unique crew members from the first page of each list
    crewFromFeaturedMovies(options: TMDBOptionsInput): [Person!]!

    # Get all available selection options for movie picker
    movieSelectionOptions: MovieSelectionOptions!
  }

  type Genre {
    id: Int!
    name: String!
    icon: String
  }

  type MovieSelectionOptions {
    genres: [Genre!]!
    moods: [MoodOption!]!
    eras: [EraOption!]!
  }

  type MoodOption {
    id: String!
    label: String!
    icon: String
  }

  type EraOption {
    id: String!
    label: String!
    value: String!
    icon: String
  }

  enum TrendingTimeWindow {
    DAY
    WEEK
  }

  type MovieTrailer {
    # Video key/ID from the video platform (e.g., YouTube video ID)
    key: String!
    # Video platform site (e.g., "YouTube", "Vimeo")
    site: String!
    # Trailer name/title (optional)
    name: String
    # Video type (e.g., "Trailer", "Teaser") (optional)
    type: String
    # Full URL to play the trailer
    url: String!
  }
`;

// Note: TMDBOptionsInput is defined in movieSchema and shared across schemas

