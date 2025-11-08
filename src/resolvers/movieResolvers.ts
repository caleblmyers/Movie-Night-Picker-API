import { Context } from "../context";
import { Movie } from "../types";
import { transformTMDBMovie } from "../utils/transformers";
import { handleError } from "../utils/errorHandler";
import {
  buildDiscoverParams,
  shouldTryFallback,
  pickRandomItem,
} from "../utils/discoverHelpers";

export const movieResolvers = {
  Query: {
    getMovie: async (
      _parent: unknown,
      args: { id: number },
      context: Context
    ): Promise<Movie> => {
      try {
        const tmdbMovie = await context.tmdb.getMovie(args.id);
        return transformTMDBMovie(tmdbMovie);
      } catch (error) {
        throw handleError(error, "Failed to fetch movie");
      }
    },

    searchMovies: async (
      _parent: unknown,
      args: { query: string },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const tmdbMovies = await context.tmdb.searchMovies(args.query);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to search movies");
      }
    },

    discoverMovies: async (
      _parent: unknown,
      args: { genres?: string[]; yearRange?: number[]; cast?: number[] },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const discoverParams = buildDiscoverParams(args);
        const tmdbMovies = await context.tmdb.discoverMovies(discoverParams);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to discover movies");
      }
    },

    suggestMovie: async (
      _parent: unknown,
      args: {
        preferences?: {
          genres?: string[];
          actors?: number[];
          yearRange?: number[];
        };
      },
      context: Context
    ): Promise<Movie> => {
      try {
        const prefs = args.preferences || {};

        // First attempt: try with all provided genres and actors
        let discoverParams = buildDiscoverParams(prefs, false);
        let tmdbMovies = await context.tmdb.discoverMovies(discoverParams);

        // If no results and we have multiple genres or actors, try with only one of each
        if (tmdbMovies.length === 0 && shouldTryFallback(prefs)) {
          discoverParams = buildDiscoverParams(prefs, true);
          tmdbMovies = await context.tmdb.discoverMovies(discoverParams);
        }

        if (tmdbMovies.length === 0) {
          throw new Error(
            "No movies found matching your selections. Try different criteria."
          );
        }

        return transformTMDBMovie(pickRandomItem(tmdbMovies));
      } catch (error) {
        throw handleError(error, "Failed to suggest movie");
      }
    },

    shuffleMovie: async (
      _parent: unknown,
      args: { genres?: string[]; yearRange?: number[]; cast?: number[] },
      context: Context
    ): Promise<Movie> => {
      try {
        // First attempt: try with all provided genres and cast members
        let discoverParams = buildDiscoverParams(args, false);
        let tmdbMovies = await context.tmdb.discoverMovies(discoverParams);

        // If no results and we have multiple genres or cast members, try with only one of each
        if (tmdbMovies.length === 0 && shouldTryFallback(args)) {
          discoverParams = buildDiscoverParams(args, true);
          tmdbMovies = await context.tmdb.discoverMovies(discoverParams);
        }

        if (tmdbMovies.length === 0) {
          throw new Error("No movies found matching the criteria");
        }

        return transformTMDBMovie(pickRandomItem(tmdbMovies));
      } catch (error) {
        throw handleError(error, "Failed to shuffle movie");
      }
    },

    randomMovie: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ): Promise<Movie> => {
      try {
        const tmdbMovie = await context.tmdb.getRandomMovie();
        return transformTMDBMovie(tmdbMovie);
      } catch (error) {
        throw handleError(error, "Failed to get random movie");
      }
    },
  },
};

