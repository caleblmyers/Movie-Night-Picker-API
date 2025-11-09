import { Context } from "../context";
import { Movie } from "../types";
import {
  GetMovieArgs,
  SearchMoviesArgs,
  DiscoverMoviesArgs,
  SuggestMovieArgs,
  ShuffleMovieArgs,
  RandomMovieArgs,
  TrendingMoviesArgs,
  NowPlayingMoviesArgs,
  PopularMoviesArgs,
  TopRatedMoviesArgs,
  ActorsFromFeaturedMoviesArgs,
  CrewFromFeaturedMoviesArgs,
} from "../types/resolvers";
import { transformTMDBMovie } from "../utils/transformers";
import type { TMDBMovieResponse } from "../utils/transformers";
import { handleError } from "../utils/errorHandler";
import {
  buildDiscoverParams,
  shouldTryFallback,
  pickRandomItem,
  buildProgressiveFallbackParams,
} from "../utils/discoverHelpers";
import {
  MOVIE_VIBES,
  ERA_OPTIONS,
  MOVIE_VIBE_ICONS,
  ERA_OPTION_ICONS,
  GENRE_ICONS,
} from "../constants";
import { convertGraphQLOptionsToTMDBOptions } from "../utils/tmdbOptionsConverter";

export const movieResolvers = {
  Query: {
    getMovie: async (
      _parent: unknown,
      args: GetMovieArgs,
      context: Context
    ): Promise<Movie> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        // Always include credits for detail page
        const tmdbMovie = await context.tmdb.getMovie(args.id, options, true);
        return transformTMDBMovie(tmdbMovie as TMDBMovieResponse);
      } catch (error) {
        throw handleError(error, "Failed to fetch movie");
      }
    },

    searchMovies: async (
      _parent: unknown,
      args: SearchMoviesArgs,
      context: Context
    ): Promise<Movie[]> => {
      try {
        // Validate and set limit (default: 20, max: 100)
        const limit = args.limit
          ? Math.min(Math.max(1, args.limit), 100)
          : 20;

        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.searchMovies(
          args.query,
          limit,
          options
        );
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to search movies");
      }
    },

    discoverMovies: async (
      _parent: unknown,
      args: DiscoverMoviesArgs,
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
          genres: args.genres,
          yearRange: args.yearRange,
          cast: actorIds,
          actors: actorIds,
          crew: crewIds,
          runtimeRange: args.runtimeRange,
          watchProviders: args.watchProviders,
          excludeGenres: args.excludeGenres,
          excludeCast: args.excludeCast,
          excludeCrew: args.excludeCrew,
          popularityRange: args.popularityRange,
          originCountries: args.originCountries,
        });
        
        // Build options with popularity range if provided
        const options = convertGraphQLOptionsToTMDBOptions({
          ...args.options,
          popularityGte: args.popularityRange?.[0],
          popularityLte: args.popularityRange?.[1],
        });
        
        const tmdbMovies = await context.tmdb.discoverMovies(
          discoverParams,
          options
        );
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to discover movies");
      }
    },

    suggestMovie: async (
      _parent: unknown,
      args: SuggestMovieArgs,
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

        // Get the selected movie ID
        const selectedMovie = pickRandomItem(tmdbMovies) as { id: number };
        
        // Fetch full movie details including videos/trailer
        const fullMovie = await context.tmdb.getMovie(selectedMovie.id, options);
        
        return transformTMDBMovie(fullMovie as TMDBMovieResponse);
      } catch (error) {
        throw handleError(error, "Failed to suggest movie");
      }
    },

    shuffleMovie: async (
      _parent: unknown,
      args: ShuffleMovieArgs,
      context: Context
    ): Promise<Movie | null> => {
      try {
        // Build TMDB options with new parameters
        const options = convertGraphQLOptionsToTMDBOptions({
          voteAverageGte: args.minVoteAverage,
          voteCountGte: args.minVoteCount,
          withOriginalLanguage: args.originalLanguage,
          popularityGte: args.popularityRange?.[0],
          popularityLte: args.popularityRange?.[1],
        });

        // Filter cast to only actors and crew to only directors/writers
        const actorIds = args.cast
          ? await context.tmdb.filterToActorsOnly(args.cast)
          : undefined;
        const crewIds = args.crew
          ? await context.tmdb.filterToCrewOnly(args.crew)
          : undefined;

        // Build discover params with all filters
        // yearRange should be [minYear, maxYear] format
        const discoverFilters = {
          genres: args.genres,
          yearRange: args.yearRange,
          cast: actorIds,
          actors: actorIds,
          crew: crewIds,
          runtimeRange: args.runtimeRange,
          watchProviders: args.watchProviders,
          excludeGenres: args.excludeGenres,
          excludeCast: args.excludeCast,
          excludeCrew: args.excludeCrew,
          popularityRange: args.popularityRange,
          originCountries: args.originCountries,
        };

        // First attempt: try with ALL provided filters (AND logic - all must match)
        // This ensures all parameters are used together
        let discoverParams = buildDiscoverParams(discoverFilters, false);
        let tmdbMovies = await context.tmdb.discoverMovies(
          discoverParams,
          options
        );

        // Only try fallback if:
        // 1. No results found
        // 2. We have multiple genres/actors/crew (can try with fewer)
        // 3. We don't have strict filters like yearRange, runtimeRange, vote filters, popularity, or exclusion filters (these should always be respected)
        const hasStrictFilters = !!(
          args.yearRange ||
          args.runtimeRange ||
          args.minVoteAverage ||
          args.minVoteCount ||
          args.originalLanguage ||
          args.popularityRange ||
          args.watchProviders ||
          args.excludeGenres ||
          args.excludeCast ||
          args.excludeCrew ||
          args.originCountries
        );
        
        if (tmdbMovies.length === 0 && shouldTryFallback(discoverFilters) && !hasStrictFilters) {
          discoverParams = buildDiscoverParams(discoverFilters, true);
          tmdbMovies = await context.tmdb.discoverMovies(
            discoverParams,
            options
          );
        }

        if (tmdbMovies.length === 0) {
          return null;
        }

        // Get the selected movie ID
        const selectedMovie = pickRandomItem(tmdbMovies) as { id: number };
        
        // Fetch full movie details including videos/trailer
        const fullMovie = await context.tmdb.getMovie(selectedMovie.id, options);
        
        return transformTMDBMovie(fullMovie as TMDBMovieResponse);
      } catch (error) {
        throw handleError(error, "Failed to shuffle movie");
      }
    },

    randomMovie: async (
      _parent: unknown,
      args: RandomMovieArgs,
      context: Context
    ): Promise<Movie> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovie = await context.tmdb.getRandomMovie(options);
        
        // Get the selected movie ID
        const movieId = (tmdbMovie as { id: number }).id;
        
        // Fetch full movie details including videos/trailer
        const fullMovie = await context.tmdb.getMovie(movieId, options);
        
        return transformTMDBMovie(fullMovie as TMDBMovieResponse);
      } catch (error) {
        throw handleError(error, "Failed to get random movie");
      }
    },

    trendingMovies: async (
      _parent: unknown,
      args: TrendingMoviesArgs,
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
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to get trending movies");
      }
    },

    nowPlayingMovies: async (
      _parent: unknown,
      args: NowPlayingMoviesArgs,
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getNowPlayingMovies(options);
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to get now playing movies");
      }
    },

    popularMovies: async (
      _parent: unknown,
      args: PopularMoviesArgs,
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getPopularMovies(options);
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to get popular movies");
      }
    },

    topRatedMovies: async (
      _parent: unknown,
      args: TopRatedMoviesArgs,
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getTopRatedMovies(options);
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
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
        return genres.map((genre) => ({
          id: genre.id,
          name: genre.name,
          icon: GENRE_ICONS[genre.id] || null,
        }));
      } catch (error) {
        throw handleError(error, "Failed to get movie genres");
      }
    },

    actorsFromFeaturedMovies: async (
      _parent: unknown,
      args: ActorsFromFeaturedMoviesArgs,
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
          ...(nowPlaying as Array<{ id: number }>).map((m) => m.id),
          ...(popular as Array<{ id: number }>).map((m) => m.id),
          ...(topRated as Array<{ id: number }>).map((m) => m.id),
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
      args: CrewFromFeaturedMoviesArgs,
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
          ...(nowPlaying as Array<{ id: number }>).map((m) => m.id),
          ...(popular as Array<{ id: number }>).map((m) => m.id),
          ...(topRated as Array<{ id: number }>).map((m) => m.id),
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
          genres: genres.map((g) => ({
            id: g.id,
            name: g.name,
            icon: GENRE_ICONS[g.id] || null,
          })),
          moods: MOVIE_VIBES.map((mood) => ({
            id: mood.id,
            label: mood.label,
            icon: MOVIE_VIBE_ICONS[mood.id] || null,
          })),
          eras: ERA_OPTIONS.map((era) => ({
            id: era.id,
            label: era.label,
            value: era.value,
            icon: ERA_OPTION_ICONS[era.id] || null,
          })),
        };
      } catch (error) {
        throw handleError(error, "Failed to get movie selection options");
      }
    },
  },
};

