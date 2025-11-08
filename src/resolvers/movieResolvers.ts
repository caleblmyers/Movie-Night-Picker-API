import { Context } from "../context";
import { Movie, TMDBOptions } from "../types";
import { transformTMDBMovie } from "../utils/transformers";
import { handleError } from "../utils/errorHandler";
import {
  buildDiscoverParams,
  shouldTryFallback,
  pickRandomItem,
  buildProgressiveFallbackParams,
} from "../utils/discoverHelpers";
import { MOVIE_VIBES, ERA_OPTIONS } from "../constants";

function convertGraphQLOptionsToTMDBOptions(
  options?: any
): TMDBOptions | undefined {
  if (!options) return undefined;

  const tmdbOptions: TMDBOptions = {};
  if (options.region) tmdbOptions.region = options.region;
  if (options.language) tmdbOptions.language = options.language;
  if (options.sortBy) tmdbOptions.sortBy = options.sortBy;
  if (options.page) tmdbOptions.page = options.page;
  if (options.year) tmdbOptions.year = options.year;
  if (options.primaryReleaseYear)
    tmdbOptions.primaryReleaseYear = options.primaryReleaseYear;
  if (options.voteAverageGte !== undefined)
    tmdbOptions.voteAverageGte = options.voteAverageGte;
  if (options.voteCountGte !== undefined)
    tmdbOptions.voteCountGte = options.voteCountGte;
  if (options.withOriginalLanguage)
    tmdbOptions.withOriginalLanguage = options.withOriginalLanguage;
  if (options.withWatchProviders)
    tmdbOptions.withWatchProviders = options.withWatchProviders;
  if (options.includeAdult !== undefined)
    tmdbOptions.includeAdult = options.includeAdult;

  return Object.keys(tmdbOptions).length > 0 ? tmdbOptions : undefined;
}

export const movieResolvers = {
  Query: {
    getMovie: async (
      _parent: unknown,
      args: { id: number; options?: any },
      context: Context
    ): Promise<Movie> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovie = await context.tmdb.getMovie(args.id, options);
        return transformTMDBMovie(tmdbMovie);
      } catch (error) {
        throw handleError(error, "Failed to fetch movie");
      }
    },

    searchMovies: async (
      _parent: unknown,
      args: { query: string; options?: any },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.searchMovies(args.query, options);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to search movies");
      }
    },

    discoverMovies: async (
      _parent: unknown,
      args: {
        genres?: number[];
        yearRange?: number[];
        cast?: number[];
        crew?: number[];
        options?: any;
      },
      context: Context
    ): Promise<Movie[]> => {
      try {
        // Filter cast to only actors
        const actorIds = args.cast
          ? await context.tmdb.filterToActorsOnly(args.cast)
          : undefined;

        // Filter crew to only directors/writers
        const crewIds = args.crew
          ? await context.tmdb.filterToCrewOnly(args.crew)
          : undefined;

        const discoverParams = buildDiscoverParams({
          ...args,
          cast: actorIds,
          actors: actorIds,
          crew: crewIds,
        });
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.discoverMovies(
          discoverParams,
          options
        );
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to discover movies");
      }
    },

    suggestMovie: async (
      _parent: unknown,
      args: {
        preferences?: {
          genres?: number[];
          actors?: number[];
          crew?: number[];
          yearRange?: number[];
          mood?: string;
          era?: string;
          options?: any;
        };
      },
      context: Context
    ): Promise<Movie> => {
      try {
        const prefs = args.preferences || {};
        const options = convertGraphQLOptionsToTMDBOptions(prefs.options);

        // Filter actors and crew
        const actorIds = prefs.actors
          ? await context.tmdb.filterToActorsOnly(prefs.actors)
          : undefined;
        const crewIds = prefs.crew
          ? await context.tmdb.filterToCrewOnly(prefs.crew)
          : undefined;

        // Build filters with filtered actors/crew
        const filters = {
          ...prefs,
          actors: actorIds,
          crew: crewIds,
        };

        // Try progressive fallback: start with all parameters, remove one at a time if no results
        const fallbackParams = buildProgressiveFallbackParams(filters);
        let tmdbMovies: unknown[] = [];

        for (const discoverParams of fallbackParams) {
          tmdbMovies = await context.tmdb.discoverMovies(discoverParams, options);
          if (tmdbMovies.length > 0) {
            break; // Found results, stop trying
          }
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
      args: {
        genres?: number[];
        yearRange?: number[];
        cast?: number[];
        crew?: number[];
        options?: any;
      },
      context: Context
    ): Promise<Movie> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);

        // Filter cast to only actors and crew to only directors/writers
        const actorIds = args.cast
          ? await context.tmdb.filterToActorsOnly(args.cast)
          : undefined;
        const crewIds = args.crew
          ? await context.tmdb.filterToCrewOnly(args.crew)
          : undefined;

        // First attempt: try with all provided genres, cast, and crew
        let discoverParams = buildDiscoverParams(
          { ...args, cast: actorIds, actors: actorIds, crew: crewIds },
          false
        );
        let tmdbMovies = await context.tmdb.discoverMovies(
          discoverParams,
          options
        );

        // If no results and we have multiple genres, cast, or crew, try with only one of each
        if (tmdbMovies.length === 0 && shouldTryFallback(args)) {
          discoverParams = buildDiscoverParams(
            { ...args, cast: actorIds, actors: actorIds, crew: crewIds },
            true
          );
          tmdbMovies = await context.tmdb.discoverMovies(
            discoverParams,
            options
          );
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
      args: { options?: any },
      context: Context
    ): Promise<Movie> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovie = await context.tmdb.getRandomMovie(options);
        return transformTMDBMovie(tmdbMovie);
      } catch (error) {
        throw handleError(error, "Failed to get random movie");
      }
    },

    trendingMovies: async (
      _parent: unknown,
      args: { timeWindow?: "DAY" | "WEEK"; options?: any },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const timeWindow = args.timeWindow
          ? args.timeWindow.toLowerCase()
          : "day";
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getTrendingMovies(
          timeWindow as "day" | "week",
          options
        );
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to get trending movies");
      }
    },

    nowPlayingMovies: async (
      _parent: unknown,
      args: { options?: any },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getNowPlayingMovies(options);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to get now playing movies");
      }
    },

    popularMovies: async (
      _parent: unknown,
      args: { options?: any },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getPopularMovies(options);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to get popular movies");
      }
    },

    topRatedMovies: async (
      _parent: unknown,
      args: { options?: any },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getTopRatedMovies(options);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw handleError(error, "Failed to get top rated movies");
      }
    },

    movieGenres: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      try {
        const genres = await context.tmdb.getGenres();
        return genres;
      } catch (error) {
        throw handleError(error, "Failed to get movie genres");
      }
    },

    actorsFromFeaturedMovies: async (
      _parent: unknown,
      args: { options?: any },
      context: Context
    ) => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);

        // Get movies from all three lists
        const [nowPlaying, popular, topRated] = await Promise.all([
          context.tmdb.getNowPlayingMovies(options),
          context.tmdb.getPopularMovies(options),
          context.tmdb.getTopRatedMovies(options),
        ]);

        // Extract movie IDs
        const movieIds = [
          ...nowPlaying.map((m: any) => m.id),
          ...popular.map((m: any) => m.id),
          ...topRated.map((m: any) => m.id),
        ];

        // Extract unique actors
        const actors = await context.tmdb.extractActorsFromMovies(movieIds);

        // Transform to Person type
        return actors.map((actor) => ({
          id: actor.id,
          name: actor.name,
          biography: null,
          profileUrl: actor.profile_path
            ? `https://image.tmdb.org/t/p/w500${actor.profile_path}`
            : null,
          birthday: null,
          placeOfBirth: null,
          knownForDepartment: null,
          popularity: null,
        }));
      } catch (error) {
        throw handleError(error, "Failed to get actors from featured movies");
      }
    },

    crewFromFeaturedMovies: async (
      _parent: unknown,
      args: { options?: any },
      context: Context
    ) => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);

        // Get movies from all three lists
        const [nowPlaying, popular, topRated] = await Promise.all([
          context.tmdb.getNowPlayingMovies(options),
          context.tmdb.getPopularMovies(options),
          context.tmdb.getTopRatedMovies(options),
        ]);

        // Extract movie IDs
        const movieIds = [
          ...nowPlaying.map((m: any) => m.id),
          ...popular.map((m: any) => m.id),
          ...topRated.map((m: any) => m.id),
        ];

        // Extract unique crew (directors/writers)
        const crew = await context.tmdb.extractCrewFromMovies(movieIds);

        // Transform to Person type
        return crew.map((member) => ({
          id: member.id,
          name: member.name,
          biography: null,
          profileUrl: member.profile_path
            ? `https://image.tmdb.org/t/p/w500${member.profile_path}`
            : null,
          birthday: null,
          placeOfBirth: null,
          knownForDepartment: null,
          popularity: null,
        }));
      } catch (error) {
        throw handleError(error, "Failed to get crew from featured movies");
      }
    },

    movieSelectionOptions: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      try {
        const genres = await context.tmdb.getGenres();
        return {
          genres: genres.map((g) => ({ id: g.id, name: g.name })),
          moods: MOVIE_VIBES.map((mood) => ({
            id: mood.id,
            label: mood.label,
          })),
          eras: ERA_OPTIONS.map((era) => ({
            id: era.id,
            label: era.label,
            value: era.value,
          })),
        };
      } catch (error) {
        throw handleError(error, "Failed to get movie selection options");
      }
    },
  },
};

