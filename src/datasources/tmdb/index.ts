/**
 * Main TMDB DataSource class that combines all methods
 */

import { TMDBOptions } from "../../types";
import { TMDBClient } from "./client";
import { MovieMethods } from "./movies";
import { PeopleMethods } from "./people";
import { CreditsMethods } from "./credits";
import { DiscoverParams } from "./types";

/**
 * Apply mixins to a class
 */
function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== "constructor") {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
            Object.create(null)
        );
      }
    });
  });
}

/**
 * TMDB DataSource - Main class combining all TMDB API functionality
 * 
 * This class combines functionality from MovieMethods, PeopleMethods, and CreditsMethods
 * to provide a unified interface for all TMDB API operations.
 */
export class TMDBDataSource extends TMDBClient {
  // Explicitly declare methods for TypeScript type checking
  // Movie methods
  getMovie!: (movieId: number, options?: TMDBOptions) => Promise<unknown>;
  searchMovies!: (query: string, options?: TMDBOptions) => Promise<unknown[]>;
  discoverMovies!: (params?: DiscoverParams, options?: TMDBOptions) => Promise<unknown[]>;
  getRandomMovie!: (options?: TMDBOptions) => Promise<unknown>;
  getTrendingMovies!: (timeWindow?: "day" | "week", options?: TMDBOptions) => Promise<unknown[]>;
  getNowPlayingMovies!: (options?: TMDBOptions) => Promise<unknown[]>;
  getPopularMovies!: (options?: TMDBOptions) => Promise<unknown[]>;
  getTopRatedMovies!: (options?: TMDBOptions) => Promise<unknown[]>;
  getGenres!: () => Promise<Array<{ id: number; name: string }>>;
  getMovieCredits!: (movieId: number) => Promise<{
    cast?: Array<{ id: number; name: string; profile_path?: string }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string;
      department?: string;
      profile_path?: string;
    }>;
  }>;
  extractActorsFromMovies!: (movieIds: number[]) => Promise<Array<{ id: number; name: string; profile_path?: string }>>;
  extractCrewFromMovies!: (movieIds: number[]) => Promise<Array<{ id: number; name: string; profile_path?: string }>>;

  // People methods
  getPerson!: (personId: number) => Promise<unknown>;
  searchPeople!: (query: string) => Promise<unknown[]>;
  getRandomPerson!: () => Promise<unknown>;
  getTrendingPeople!: (timeWindow?: "day" | "week", options?: TMDBOptions) => Promise<unknown[]>;

  // Credits methods
  getPersonCombinedCredits!: (personId: number) => Promise<{
    cast?: unknown[];
    crew?: Array<{ job?: string; department?: string }>;
  }>;
  isActor!: (personId: number) => Promise<boolean>;
  isDirectorOrWriter!: (personId: number) => Promise<boolean>;
  filterToActorsOnly!: (personIds: number[]) => Promise<number[]>;
  filterToCrewOnly!: (personIds: number[]) => Promise<number[]>;
  filterPeopleByRole!: (
    people: Array<{ id: number }>,
    roleType: "actor" | "crew" | "both"
  ) => Promise<Array<{ id: number }>>;

  constructor(apiKey: string) {
    super(apiKey);
  }
}

// Apply mixins to combine all methods
applyMixins(TMDBDataSource, [MovieMethods, PeopleMethods, CreditsMethods]);

// Export types for external use
export * from "./types";

