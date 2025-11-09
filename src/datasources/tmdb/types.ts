/**
 * Type definitions and constants for TMDB datasource
 */

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const MAX_PAGES = 500; // TMDB API limit

// Default TMDB options
export const DEFAULT_REGION = "US";
export const DEFAULT_LANGUAGE = "en-US";
export const DEFAULT_SORT_BY = "popularity.desc";
export const DEFAULT_PAGE = 1;
export const DEFAULT_INCLUDE_ADULT = false;

// Cache configuration
export const CACHE_TTL = {
  GENRES: 24 * 60 * 60 * 1000, // 24 hours
  MOVIE_CREDITS: 60 * 60 * 1000, // 1 hour
  PERSON_CREDITS: 60 * 60 * 1000, // 1 hour
  MOVIE: 30 * 60 * 1000, // 30 minutes
  PERSON: 30 * 60 * 1000, // 30 minutes
  SEARCH: 5 * 60 * 1000, // 5 minutes - short TTL for search results
};

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface PersonRoleInfo {
  isActor: boolean;
  isCrew: boolean;
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

