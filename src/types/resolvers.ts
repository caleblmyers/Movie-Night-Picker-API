import { User } from "@prisma/client";
import { Context } from "../context";

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
 * Auth payload response
 */
export interface AuthPayload {
  token: string;
  user: UserWithoutPassword;
}

