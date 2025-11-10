import { Context } from "../context";
import { Movie } from "../types";
import {
  GetMovieArgs,
  SearchMoviesArgs,
  SearchKeywordsArgs,
  DiscoverMoviesArgs,
  SuggestMovieArgs,
  ShuffleMovieArgs,
  RandomMovieArgs,
  TrendingMoviesArgs,
  NowPlayingMoviesArgs,
  PopularMoviesArgs,
  TopRatedMoviesArgs,
  UpcomingMoviesArgs,
  RandomMovieFromSourceArgs,
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
  getMovieIdsFromCollections,
  getAllMovieIdsInCollections,
  filterMoviesByCollections,
} from "../utils/collectionHelpers";
import {
  MOVIE_VIBES,
  ERA_OPTIONS,
  MOVIE_VIBE_ICONS,
  ERA_OPTION_ICONS,
  GENRE_ICONS,
  getPopularityRange,
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
        let tmdbMovies = await context.tmdb.searchMovies(
          args.query,
          limit * 2, // Fetch more to account for filtering
          options
        );

        // Filter by popularity level if provided
        if (args.popularityLevel) {
          const [minPopularity, maxPopularity] = getPopularityRange(args.popularityLevel);
          tmdbMovies = (tmdbMovies as Array<{ popularity?: number }>).filter((movie) => {
            const popularity = movie.popularity ?? 0;
            return popularity >= minPopularity && popularity <= maxPopularity;
          });
        }

        // Apply final limit after filtering
        const finalResults = tmdbMovies.slice(0, limit);
        return finalResults.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to search movies");
      }
    },

    searchKeywords: async (
      _parent: unknown,
      args: SearchKeywordsArgs,
      context: Context
    ) => {
      try {
        // Validate and set limit (default: 20, max: 100)
        const limit = args.limit
          ? Math.min(Math.max(1, args.limit), 100)
          : 20;

        const keywords = await context.tmdb.searchKeywords(args.query, limit);
        return keywords.map((k) => ({
          id: k.id,
          name: k.name,
        }));
      } catch (error) {
        throw handleError(error, "Failed to search keywords");
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
          popularityLevel: args.popularityLevel,
          originCountries: args.originCountries,
          keywords: args.keywordIds,
        });
        
        // Build options with popularity range if provided (from range or level)
        const popularityRange = args.popularityRange || 
          (args.popularityLevel ? getPopularityRange(args.popularityLevel) : undefined);
        const options = convertGraphQLOptionsToTMDBOptions({
          ...args.options,
          popularityGte: popularityRange?.[0],
          popularityLte: popularityRange?.[1],
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

        // Get user for collection filtering (if needed)
        const user = context.user;
        let inCollectionIds: Set<number> | null = null;
        let excludeCollectionIds: Set<number> | null = null;
        let allCollectionMovieIds: Set<number> | null = null;

        // Handle collection filtering if user is authenticated
        if (user) {
          if (prefs.inCollections && prefs.inCollections.length > 0) {
            const movieIds = await getMovieIdsFromCollections(
              context.prisma,
              user.id,
              prefs.inCollections
            );
            inCollectionIds = new Set(movieIds);
          }

          if (prefs.excludeCollections && prefs.excludeCollections.length > 0) {
            const movieIds = await getMovieIdsFromCollections(
              context.prisma,
              user.id,
              prefs.excludeCollections
            );
            excludeCollectionIds = new Set(movieIds);
          }

          if (prefs.notInAnyCollection) {
            const movieIds = await getAllMovieIdsInCollections(
              context.prisma,
              user.id
            );
            allCollectionMovieIds = new Set(movieIds);
          }
        }

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
          keywords: prefs.keywordIds,
          popularityLevel: prefs.popularityLevel,
        };

        // Try progressive fallback: start with all parameters, remove one at a time if no results
        const fallbackParams = buildProgressiveFallbackParams(filters);
        let tmdbMovies: unknown[] = [];

        for (const discoverParams of fallbackParams) {
          tmdbMovies = await context.tmdb.discoverMovies(discoverParams, options);
          
          // Apply collection filtering
          if (inCollectionIds || excludeCollectionIds || prefs.notInAnyCollection) {
            tmdbMovies = filterMoviesByCollections(
              tmdbMovies as Array<{ id: number }>,
              inCollectionIds,
              excludeCollectionIds,
              prefs.notInAnyCollection || false,
              allCollectionMovieIds
            );
          }
          
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
        // Check if any parameters are provided
        const hasAnyParams = !!(
          args.genres ||
          args.yearRange ||
          args.cast ||
          args.crew ||
          args.minVoteAverage ||
          args.minVoteCount ||
          args.runtimeRange ||
          args.originalLanguage ||
          args.watchProviders ||
          args.excludeGenres ||
          args.excludeCast ||
          args.excludeCrew ||
          args.popularityRange ||
          args.popularityLevel ||
          args.originCountries ||
          args.keywordIds ||
          args.inCollections ||
          args.excludeCollections ||
          args.notInAnyCollection
        );

        // Helper function to generate random parameters
        const generateRandomParams = async (): Promise<ShuffleMovieArgs> => {
          const randomArgs: ShuffleMovieArgs = {};
          
          // Get available genres
          const allGenres = await context.tmdb.getGenres();
          const genreIds = allGenres.map((g) => g.id);

          // Randomly select 1-3 genres
          const numGenres = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
          const shuffledGenres = [...genreIds].sort(() => Math.random() - 0.5);
          randomArgs.genres = shuffledGenres.slice(0, numGenres);

          // Randomly select a popularity level (HIGH, AVERAGE, or LOW)
          const popularityLevels: Array<"HIGH" | "AVERAGE" | "LOW"> = ["HIGH", "AVERAGE", "LOW"];
          randomArgs.popularityLevel = pickRandomItem(popularityLevels);

          // Randomly select a decade/year range (last 50 years)
          const currentYear = new Date().getFullYear();
          const startYear = currentYear - 50;
          const decadeStart = startYear + Math.floor(Math.random() * 5) * 10; // Random decade start
          const decadeEnd = Math.min(decadeStart + 9, currentYear);
          randomArgs.yearRange = [decadeStart, decadeEnd];

          // 30% chance to add random runtime range
          if (Math.random() < 0.3) {
            const runtimeOptions = [
              [60, 90],   // Short
              [90, 120],  // Medium
              [120, 150], // Long
              [150, 200], // Very long
            ];
            randomArgs.runtimeRange = pickRandomItem(runtimeOptions);
          }

          // 20% chance to add minimum vote average (5.0-7.5)
          if (Math.random() < 0.2) {
            randomArgs.minVoteAverage = 5.0 + Math.random() * 2.5; // Random between 5.0 and 7.5
          }

          return randomArgs;
        };

        // If no parameters provided, generate random ones for better randomization
        let randomArgs = { ...args };
        const wasRandomGenerated = !hasAnyParams;
        if (wasRandomGenerated) {
          randomArgs = await generateRandomParams();
        }

        // Maximum retries when using random parameters (to ensure we get a result)
        const maxRetries = wasRandomGenerated ? 5 : 0;
        let attempts = 0;
        let tmdbMovies: unknown[] = [];
        let options: any;
        let discoverFilters: any;
        let discoverParams: any;
        let inCollectionIds: Set<number> | null = null;
        let excludeCollectionIds: Set<number> | null = null;
        let allCollectionMovieIds: Set<number> | null = null;

        while (attempts <= maxRetries) {
          // Build TMDB options with new parameters
          const popularityRange = randomArgs.popularityRange || 
            (randomArgs.popularityLevel ? getPopularityRange(randomArgs.popularityLevel) : undefined);
          options = convertGraphQLOptionsToTMDBOptions({
            voteAverageGte: randomArgs.minVoteAverage,
            voteCountGte: randomArgs.minVoteCount,
            withOriginalLanguage: randomArgs.originalLanguage,
            popularityGte: popularityRange?.[0],
            popularityLte: popularityRange?.[1],
          });

          // Get user for collection filtering (if needed)
          const user = context.user;

          // Handle collection filtering if user is authenticated
          if (user) {
            if (randomArgs.inCollections && randomArgs.inCollections.length > 0) {
              const movieIds = await getMovieIdsFromCollections(
                context.prisma,
                user.id,
                randomArgs.inCollections
              );
              inCollectionIds = new Set(movieIds);
            }

            if (randomArgs.excludeCollections && randomArgs.excludeCollections.length > 0) {
              const movieIds = await getMovieIdsFromCollections(
                context.prisma,
                user.id,
                randomArgs.excludeCollections
              );
              excludeCollectionIds = new Set(movieIds);
            }

            if (randomArgs.notInAnyCollection) {
              const movieIds = await getAllMovieIdsInCollections(
                context.prisma,
                user.id
              );
              allCollectionMovieIds = new Set(movieIds);
            }
          }

          // Filter cast to only actors and crew to only directors/writers
          const actorIds = randomArgs.cast
            ? await context.tmdb.filterToActorsOnly(randomArgs.cast)
            : undefined;
          const crewIds = randomArgs.crew
            ? await context.tmdb.filterToCrewOnly(randomArgs.crew)
            : undefined;

          // Build discover params with all filters (using randomArgs if generated)
          // yearRange should be [minYear, maxYear] format
          discoverFilters = {
            genres: randomArgs.genres,
            yearRange: randomArgs.yearRange,
            cast: actorIds,
            actors: actorIds,
            crew: crewIds,
            runtimeRange: randomArgs.runtimeRange,
            watchProviders: randomArgs.watchProviders,
            excludeGenres: randomArgs.excludeGenres,
            excludeCast: randomArgs.excludeCast,
            excludeCrew: randomArgs.excludeCrew,
            popularityRange: randomArgs.popularityRange,
            popularityLevel: randomArgs.popularityLevel,
            originCountries: randomArgs.originCountries,
            keywords: randomArgs.keywordIds,
          };

          // First attempt: try with ALL provided filters (AND logic - all must match)
          // This ensures all parameters are used together
          discoverParams = buildDiscoverParams(discoverFilters, false);
          tmdbMovies = await context.tmdb.discoverMovies(
            discoverParams,
            options
          );

          // Apply collection filtering
          if (inCollectionIds || excludeCollectionIds || randomArgs.notInAnyCollection) {
            tmdbMovies = filterMoviesByCollections(
              tmdbMovies as Array<{ id: number }>,
              inCollectionIds,
              excludeCollectionIds,
              randomArgs.notInAnyCollection || false,
              allCollectionMovieIds
            );
          }

          // Only try fallback if:
          // 1. No results found
          // 2. We have multiple genres/actors/crew (can try with fewer)
          // 3. We don't have strict filters like yearRange, runtimeRange, vote filters, popularity, exclusion filters, keywords, or collection filters (these should always be respected)
          // Note: If random params were generated, we still respect them as strict filters to maintain randomness
          const hasStrictFilters = !!(
            randomArgs.yearRange ||
            randomArgs.runtimeRange ||
            randomArgs.minVoteAverage ||
            randomArgs.minVoteCount ||
            randomArgs.originalLanguage ||
            randomArgs.popularityRange ||
            randomArgs.popularityLevel ||
            randomArgs.watchProviders ||
            randomArgs.excludeGenres ||
            randomArgs.excludeCast ||
            randomArgs.excludeCrew ||
            randomArgs.originCountries ||
            randomArgs.keywordIds ||
            randomArgs.inCollections ||
            randomArgs.excludeCollections ||
            randomArgs.notInAnyCollection
          );
          
          if (tmdbMovies.length === 0 && shouldTryFallback(discoverFilters) && !hasStrictFilters) {
            discoverParams = buildDiscoverParams(discoverFilters, true);
            tmdbMovies = await context.tmdb.discoverMovies(
              discoverParams,
              options
            );
            
            // Apply collection filtering to fallback results too
            if (inCollectionIds || excludeCollectionIds || randomArgs.notInAnyCollection) {
              tmdbMovies = filterMoviesByCollections(
                tmdbMovies as Array<{ id: number }>,
                inCollectionIds,
                excludeCollectionIds,
                randomArgs.notInAnyCollection || false,
                allCollectionMovieIds
              );
            }
          }

          // If we found results, break out of retry loop
          if (tmdbMovies.length > 0) {
            break;
          }

          // If no results and we're using random params, try again with new random params
          if (wasRandomGenerated && attempts < maxRetries) {
            attempts++;
            // Generate new random parameters for next iteration
            randomArgs = await generateRandomParams();
            // Continue to next iteration with new random params
            continue;
          }

          // If we've exhausted retries or user provided params, break
          break;
        }

        // If still no results after retries, return null
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

    upcomingMovies: async (
      _parent: unknown,
      args: UpcomingMoviesArgs,
      context: Context
    ): Promise<Movie[]> => {
      try {
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbMovies = await context.tmdb.getUpcomingMovies(options);
        return tmdbMovies.map((m) =>
          transformTMDBMovie(m as TMDBMovieResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to get upcoming movies");
      }
    },

    randomMovieFromSource: async (
      _parent: unknown,
      args: RandomMovieFromSourceArgs,
      context: Context
    ): Promise<Movie> => {
      try {
        // Convert GraphQL enum to lowercase for TMDB API
        const sourceMap: Record<string, "trending" | "now_playing" | "popular" | "top_rated" | "upcoming"> = {
          TRENDING: "trending",
          NOW_PLAYING: "now_playing",
          POPULAR: "popular",
          TOP_RATED: "top_rated",
          UPCOMING: "upcoming",
        };

        // If source is not provided, randomly select one
        let selectedSource = args.source;
        if (!selectedSource) {
          const sources: Array<"TRENDING" | "NOW_PLAYING" | "POPULAR" | "TOP_RATED" | "UPCOMING"> = [
            "TRENDING",
            "NOW_PLAYING",
            "POPULAR",
            "TOP_RATED",
            "UPCOMING",
          ];
          selectedSource = pickRandomItem(sources);
        }

        const tmdbSource = sourceMap[selectedSource];
        if (!tmdbSource) {
          throw new Error(`Invalid source: ${selectedSource}`);
        }

        // For trending, randomly select timeWindow if not provided
        let timeWindow: "day" | "week" = "day";
        if (tmdbSource === "trending") {
          if (args.timeWindow) {
            timeWindow = args.timeWindow.toLowerCase() as "day" | "week";
          } else {
            // Randomly select day or week for trending
            timeWindow = pickRandomItem(["day", "week"]);
          }
        } else if (args.timeWindow) {
          // Use provided timeWindow even for non-trending (will be ignored by API)
          timeWindow = args.timeWindow.toLowerCase() as "day" | "week";
        }

        const options = convertGraphQLOptionsToTMDBOptions(args.options);

        const tmdbMovie = await context.tmdb.getRandomMovieFromSource(
          tmdbSource,
          timeWindow,
          options
        );

        // Get the selected movie ID
        const movieId = (tmdbMovie as { id: number }).id;

        // Fetch full movie details including videos/trailer
        const fullMovie = await context.tmdb.getMovie(movieId, options);

        return transformTMDBMovie(fullMovie as TMDBMovieResponse);
      } catch (error) {
        throw handleError(error, "Failed to get random movie from source");
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

