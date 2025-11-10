import { User } from "@prisma/client";
import { Context } from "../context";
import { GraphQLOptionsInput } from "./index";

/**
 * Base resolver function type
 */
export type Resolver<TParent = any, TArgs = any, TReturn = any> = (
  parent: TParent,
  args: TArgs,
  context: Context
) => Promise<TReturn> | TReturn;

/**
 * User without password field
 */
export type UserWithoutPassword = Omit<User, "password">;

/**
 * Authentication arguments
 */
export interface AuthArgs {
  email: string;
  password: string;
}

/**
 * Movie-related arguments
 */
export interface SaveMovieArgs {
  tmdbId: number;
}

export interface RateMovieArgs {
  tmdbId: number;
  rating: number;
}

export interface ReviewMovieArgs {
  tmdbId: number;
  content: string;
}

/**
 * Movie Query Arguments
 */
export interface GetMovieArgs {
  id: number;
  options?: GraphQLOptionsInput;
}

export interface SearchMoviesArgs {
  query: string;
  limit?: number;
  popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
  filterByCollectionAnalysis?: number;
  inCollections?: number[];
  excludeCollections?: number[];
  notInAnyCollection?: boolean;
  options?: GraphQLOptionsInput;
}

export interface SearchKeywordsArgs {
  query: string;
  limit?: number;
}

export interface DiscoverMoviesArgs {
  genres?: number[];
  yearRange?: number[];
  cast?: number[];
  crew?: number[];
  runtimeRange?: number[];
  watchProviders?: string;
  excludeGenres?: number[];
  excludeCast?: number[];
  excludeCrew?: number[];
  popularityRange?: number[];
  popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
  originCountries?: string[];
  keywordIds?: number[];
  filterByCollectionAnalysis?: number;
  inCollections?: number[];
  excludeCollections?: number[];
  notInAnyCollection?: boolean;
  options?: GraphQLOptionsInput;
}

export interface MoviePreferencesInput {
  genres?: number[];
  actors?: number[];
  crew?: number[];
  yearRange?: number[];
  mood?: string;
  era?: string;
  keywordIds?: number[];
  popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
  inCollections?: number[];
  excludeCollections?: number[];
  notInAnyCollection?: boolean;
  options?: GraphQLOptionsInput;
}

export interface SuggestMovieArgs {
  selectedMovieIds: number[];
}

export interface SuggestMovieRoundArgs {
  round: number;
}

export interface ShuffleMovieArgs {
  genres?: number[];
  yearRange?: number[];
  cast?: number[];
  crew?: number[];
  minVoteAverage?: number;
  minVoteCount?: number;
  runtimeRange?: number[];
  originalLanguage?: string;
  watchProviders?: string;
  excludeGenres?: number[];
  excludeCast?: number[];
  excludeCrew?: number[];
  popularityRange?: number[];
  popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
  originCountries?: string[];
  keywordIds?: number[];
  filterByCollectionAnalysis?: number;
  inCollections?: number[];
  excludeCollections?: number[];
  notInAnyCollection?: boolean;
}

export interface RandomMovieArgs {
  options?: GraphQLOptionsInput;
}

export interface TrendingMoviesArgs {
  timeWindow?: "DAY" | "WEEK";
  options?: GraphQLOptionsInput;
}

export interface NowPlayingMoviesArgs {
  options?: GraphQLOptionsInput;
}

export interface PopularMoviesArgs {
  options?: GraphQLOptionsInput;
}

export interface TopRatedMoviesArgs {
  options?: GraphQLOptionsInput;
}

export interface UpcomingMoviesArgs {
  options?: GraphQLOptionsInput;
}

export interface RandomMovieFromSourceArgs {
  source?: "TRENDING" | "NOW_PLAYING" | "POPULAR" | "TOP_RATED" | "UPCOMING";
  timeWindow?: "DAY" | "WEEK";
  options?: GraphQLOptionsInput;
}

export interface RandomActorFromSourceArgs {
  source?: "TRENDING" | "NOW_PLAYING" | "POPULAR" | "TOP_RATED" | "UPCOMING";
  timeWindow?: "DAY" | "WEEK";
  options?: GraphQLOptionsInput;
}

export interface ActorsFromFeaturedMoviesArgs {
  options?: GraphQLOptionsInput;
}

export interface CrewFromFeaturedMoviesArgs {
  options?: GraphQLOptionsInput;
}

/**
 * Person Query Arguments
 */
export interface GetPersonArgs {
  id: number;
}

export interface SearchPeopleArgs {
  query: string;
  limit?: number;
  roleType?: "ACTOR" | "CREW" | "BOTH";
  options?: GraphQLOptionsInput;
}

export interface RandomPersonArgs {
  // No arguments
}

export interface TrendingPeopleArgs {
  timeWindow?: "DAY" | "WEEK";
  roleType?: "ACTOR" | "CREW" | "BOTH";
  options?: GraphQLOptionsInput;
}

/**
 * User Mutation Arguments
 */
export interface UpdateNameArgs {
  name: string;
}

/**
 * Collection Query Arguments
 */
export interface GetCollectionArgs {
  id: number;
}

export interface CollectionInsightsArgs {
  collectionId: number;
}

export interface CollectionAnalysisArgs {
  collectionId: number;
  limit?: number;
}

/**
 * Collection Mutation Arguments
 */
export interface CreateCollectionArgs {
  name: string;
  description?: string | null;
  isPublic?: boolean | null;
}

export interface UpdateCollectionArgs {
  id: number;
  name?: string | null;
  description?: string | null;
  isPublic?: boolean | null;
}

export interface DeleteCollectionArgs {
  id: number;
}

export interface AddMovieToCollectionArgs {
  collectionId: number;
  tmdbId: number;
}

export interface RemoveMovieFromCollectionArgs {
  collectionId: number;
  tmdbId: number;
}

/**
 * Auth payload response
 */
export interface AuthPayload {
  token: string;
  user: UserWithoutPassword;
}

