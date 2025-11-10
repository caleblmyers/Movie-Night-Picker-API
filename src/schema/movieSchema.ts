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
    # Keywords/themes associated with the movie (e.g., "superhero", "time travel")
    keywords: [Keyword!]!
    # Trailer information (if available)
    trailer: MovieTrailer
    # Cast members (actors) - available when fetching full movie details
    cast: [CastMember!]!
    # Crew members (directors, writers, etc.) - available when fetching full movie details
    crew: [CrewMember!]!
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
    # Keyword IDs for thematic filtering (e.g., "superhero", "time travel")
    keywordIds: [Int!]
    # Popularity level (HIGH, AVERAGE, LOW) - alternative to popularityRange
    popularityLevel: PopularityLevel
    # Collection filtering options
    # Only include movies from these collection IDs
    inCollections: [Int!]
    # Exclude movies from these collection IDs
    excludeCollections: [Int!]
    # Only include movies not in any collection
    notInAnyCollection: Boolean
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
    # Minimum popularity score
    popularityGte: Float
    # Maximum popularity score
    popularityLte: Float
    # Include adult content (default: false)
    includeAdult: Boolean
  }

  extend type Query {
    # Get a single movie by TMDB ID
    getMovie(id: Int!, options: TMDBOptionsInput): Movie

    # Search movies by query string (smart search with fuzzy matching)
    # TMDB automatically performs case-insensitive partial matching
    # limit: Maximum number of results to return (default: 20, max: 100)
    # popularityLevel: Filter by popularity level (HIGH, AVERAGE, LOW) - filters results after search
    searchMovies(query: String!, limit: Int, popularityLevel: PopularityLevel, options: TMDBOptionsInput): [Movie!]!

    # Search keywords by query string (for autocomplete in filter UI)
    # TMDB automatically performs case-insensitive partial matching
    # Returns keywords that can be used to filter movies
    searchKeywords(query: String!, limit: Int): [Keyword!]!

    # Discover movies with filters
    # cast: Only actors (filtered automatically)
    # crew: Only directors/writers (filtered automatically)
    discoverMovies(
      genres: [Int!]
      yearRange: [Int!]
      cast: [Int!]
      crew: [Int!]
      # Runtime range [min, max] in minutes
      runtimeRange: [Int!]
      # Streaming availability - comma-separated watch provider IDs
      watchProviders: String
      # Exclude genres by ID
      excludeGenres: [Int!]
      # Exclude cast members (actors) by person ID
      excludeCast: [Int!]
      # Exclude crew members by person ID
      excludeCrew: [Int!]
      # Popularity range [min, max] - TMDB popularity score
      popularityRange: [Float!]
      # Popularity level (HIGH, AVERAGE, LOW) - alternative to popularityRange
      popularityLevel: PopularityLevel
      # Production countries - ISO 3166-1 alpha-2 country codes
      originCountries: [String!]
      # Keyword IDs for thematic filtering (e.g., "superhero", "time travel")
      keywordIds: [Int!]
      options: TMDBOptionsInput
    ): [Movie!]!

    # Suggest a movie based on user selections (genres, actors, year range)
    # Returns a single random movie matching the criteria
    # All parameters are optional - can be called with any combination
    suggestMovie(preferences: MoviePreferencesInput): Movie

    # Shuffle/random movie (uses discover and returns one random result)
    # Accepts optional genres (as IDs), yearRange, cast (actors), crew (directors/writers),
    # minVoteAverage, minVoteCount, runtimeRange, originalLanguage, streaming providers,
    # excludeGenres, excludeCast, excludeCrew, popularityRange, and originCountries
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
      # Streaming availability - comma-separated watch provider IDs (e.g., "8,9" for Netflix, Amazon Prime)
      watchProviders: String
      # Exclude genres by ID
      excludeGenres: [Int!]
      # Exclude cast members (actors) by person ID
      excludeCast: [Int!]
      # Exclude crew members by person ID
      excludeCrew: [Int!]
      # Popularity range [min, max] - TMDB popularity score
      popularityRange: [Float!]
      # Popularity level (HIGH, AVERAGE, LOW) - alternative to popularityRange
      popularityLevel: PopularityLevel
      # Production countries - ISO 3166-1 alpha-2 country codes (e.g., ["US", "GB"])
      originCountries: [String!]
      # Keyword IDs for thematic filtering (e.g., "superhero", "time travel", "dystopia")
      keywordIds: [Int!]
      # Collection filtering options
      # Only include movies from these collection IDs
      inCollections: [Int!]
      # Exclude movies from these collection IDs
      excludeCollections: [Int!]
      # Only include movies not in any collection
      notInAnyCollection: Boolean
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

    # Get upcoming movies
    upcomingMovies(options: TMDBOptionsInput): [Movie!]!

    # Get a random movie from trending, now playing, popular, top rated, or upcoming
    # source: Which source to use (if not provided, a random source will be selected)
    # timeWindow: For trending only - "day" or "week" (if not provided, randomly selected for trending, ignored for other sources)
    randomMovieFromSource(
      source: MovieSource
      timeWindow: TrendingTimeWindow
      options: TMDBOptionsInput
    ): Movie

    # Get a random actor from trending, now playing, popular, top rated, or upcoming movies
    # source: Which source to use (if not provided, a random source will be selected)
    # timeWindow: For trending only - "day" or "week" (if not provided, randomly selected for trending, ignored for other sources)
    randomActorFromSource(
      source: MovieSource
      timeWindow: TrendingTimeWindow
      options: TMDBOptionsInput
    ): Person

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

  enum MovieSource {
    TRENDING
    NOW_PLAYING
    POPULAR
    TOP_RATED
    UPCOMING
  }

  enum PopularityLevel {
    HIGH
    AVERAGE
    LOW
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

  type CastMember {
    id: Int!
    name: String!
    character: String
    profileUrl: String
    order: Int
  }

  type CrewMember {
    id: Int!
    name: String!
    job: String
    department: String
    profileUrl: String
  }

  type Keyword {
    id: Int!
    name: String!
  }
`;

// Note: TMDBOptionsInput is defined in movieSchema and shared across schemas

