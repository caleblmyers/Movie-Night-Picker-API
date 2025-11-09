export interface Movie {
  id: number;
  title: string;
  overview?: string | null;
  posterUrl?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  trailer?: {
    key: string;
    site: string;
    name: string;
    type: string;
    url: string;
  } | null;
  cast?: Array<{
    id: number;
    name: string;
    character?: string | null;
    profileUrl?: string | null;
    order?: number | null;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    job?: string | null;
    department?: string | null;
    profileUrl?: string | null;
  }>;
}

export interface Person {
  id: number;
  name: string;
  biography?: string | null;
  profileUrl?: string | null;
  birthday?: string | null;
  placeOfBirth?: string | null;
  knownForDepartment?: string | null;
  popularity?: number | null;
}

export interface DiscoverParams {
  genres?: number[];
  yearRange?: number[];
  actors?: number[];
  crew?: number[];
  keywords?: number[];
  runtimeRange?: number[];
  watchProviders?: string;
  excludeGenres?: number[];
  excludeCast?: number[];
  excludeCrew?: number[];
  popularityRange?: number[];
  originCountries?: string[];
}

export interface TMDBOptions {
  region?: string;
  language?: string;
  sortBy?: string;
  page?: number;
  year?: number;
  primaryReleaseYear?: number;
  voteAverageGte?: number;
  voteCountGte?: number;
  withOriginalLanguage?: string;
  withWatchProviders?: string;
  includeAdult?: boolean;
  popularityGte?: number;
  popularityLte?: number;
}

/**
 * GraphQL input type for TMDB options
 * Matches the TMDBOptionsInput from the GraphQL schema
 */
export interface GraphQLOptionsInput {
  region?: string;
  language?: string;
  sortBy?: string;
  page?: number;
  year?: number;
  primaryReleaseYear?: number;
  voteAverageGte?: number;
  voteCountGte?: number;
  withOriginalLanguage?: string;
  withWatchProviders?: string;
  includeAdult?: boolean;
  popularityGte?: number;
  popularityLte?: number;
}

// Re-export resolver types for convenience
export * from "./resolvers";