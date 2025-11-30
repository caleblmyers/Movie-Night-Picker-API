import { Context } from "../context";
import { Movie } from "../types";
import {
  GetMovieArgs,
  SearchMoviesArgs,
  SearchKeywordsArgs,
  DiscoverMoviesArgs,
  SuggestMovieArgs,
  SuggestMovieRoundArgs,
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
  MoviePreferencesInput,
} from "../types/resolvers";
import { transformTMDBMovie } from "../utils/transformers";
import type { TMDBMovieResponse } from "../utils/transformers";
import { handleError } from "../utils/errorHandler";
import {
  buildDiscoverParams,
  shouldTryFallback,
  pickRandomItem,
  buildProgressiveFallbackParams,
  DiscoverFilters,
} from "../utils/discoverHelpers";
import {
  getMovieIdsFromCollections,
  getAllMovieIdsInCollections,
  filterMoviesByCollections,
  getCollectionAnalysisForFiltering,
} from "../utils/collectionHelpers";
import {
  getSuggestHistory,
  addToSuggestHistory,
} from "../utils/dbHelpers";
import {
  MOVIE_VIBES,
  ERA_OPTIONS,
  MOVIE_VIBE_ICONS,
  ERA_OPTION_ICONS,
  GENRE_ICONS,
  getPopularityRange,
  MOOD_TO_KEYWORDS,
  getEraYearRange,
  SUGGEST_MOVIE_ROUNDS,
} from "../constants";
import { convertGraphQLOptionsToTMDBOptions } from "../utils/tmdbOptionsConverter";

/**
 * Extract and aggregate categories from selected movies
 * Returns simplified preferences that are less restrictive for better discovery
 */
async function extractCategoriesFromMovies(
  movieIds: number[],
  context: Context
): Promise<MoviePreferencesInput> {
  const preferences: MoviePreferencesInput = {
    genres: [],
    keywordIds: [],
    actors: [],
    crew: [],
    yearRange: undefined,
  };

  const years: number[] = [];
  const genreCounts = new Map<number, number>();
  const keywordCounts = new Map<number, number>();
  const actorCounts = new Map<number, number>();
  const crewCounts = new Map<number, number>();

  // Fetch all selected movies in parallel (with credits for actors/crew)
  const moviePromises = movieIds.map((id) =>
    context.tmdb.getMovie(id, undefined, true).catch(() => null)
  );
  const movies = await Promise.all(moviePromises);

  // Fetch keywords for all movies in parallel
  const keywordPromises = movieIds.map((id) =>
    context.tmdb.getMovieKeywords(id).catch(() => ({ keywords: [] }))
  );
  const keywordResults = await Promise.all(keywordPromises);

  // Extract categories from each movie and count frequencies
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (!movie) continue;

    const movieData = movie as {
      genres?: Array<{ id: number; name: string }>;
      release_date?: string;
      credits?: {
        cast?: Array<{ id: number; name: string }>;
        crew?: Array<{ id: number; name: string; job?: string }>;
      };
    };

    // Count genre frequencies
    if (movieData.genres) {
      movieData.genres.forEach((genre) => {
        genreCounts.set(genre.id, (genreCounts.get(genre.id) || 0) + 1);
      });
    }

    // Count keyword frequencies
    const keywordData = keywordResults[i];
    if (keywordData?.keywords) {
      keywordData.keywords.forEach((keyword: { id: number; name: string }) => {
        keywordCounts.set(keyword.id, (keywordCounts.get(keyword.id) || 0) + 1);
      });
    }

    // Extract release year
    if (movieData.release_date) {
      const year = parseInt(movieData.release_date.substring(0, 4), 10);
      if (!isNaN(year)) {
        years.push(year);
      }
    }

    // Count actor frequencies (top 3 actors per movie)
    if (movieData.credits?.cast) {
      movieData.credits.cast.slice(0, 3).forEach((actor) => {
        actorCounts.set(actor.id, (actorCounts.get(actor.id) || 0) + 1);
      });
    }

    // Count crew frequencies (directors and writers only)
    if (movieData.credits?.crew) {
      movieData.credits.crew
        .filter((member) => {
          const job = member.job?.toLowerCase() || "";
          return job.includes("director") || job.includes("writer") || job.includes("screenplay");
        })
        .slice(0, 2)
        .forEach((member) => {
          crewCounts.set(member.id, (crewCounts.get(member.id) || 0) + 1);
        });
    }
  }

  // Select top genres (most common, limit to 2-3 for less restriction)
  const sortedGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  preferences.genres = sortedGenres.length > 0 ? sortedGenres : [];

  // Select top keywords (most common, limit to 3-5 for less restriction)
  const sortedKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  preferences.keywordIds = sortedKeywords.length > 0 ? sortedKeywords : [];

  // Select top actors (most common, limit to 2 for less restriction)
  const sortedActors = Array.from(actorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
  preferences.actors = sortedActors.length > 0 ? sortedActors : [];

  // Select top crew (most common, limit to 1-2 for less restriction)
  const sortedCrew = Array.from(crewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
  preferences.crew = sortedCrew.length > 0 ? sortedCrew : [];

  // Calculate flexible year range (expand by 5 years on each side for more variety)
  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearSpan = maxYear - minYear;
    // Expand range: add 5 years on each side, or 50% of span (whichever is larger)
    const expansion = Math.max(5, Math.floor(yearSpan * 0.5));
    const expandedMin = Math.max(1900, minYear - expansion); // Don't go before 1900
    const expandedMax = Math.min(new Date().getFullYear(), maxYear + expansion); // Don't go past current year
    preferences.yearRange = [expandedMin, expandedMax];
  }

  return preferences;
}

/**
 * Generate 4 diverse category combinations for a suggest round
 * Each combination represents different genres, moods, eras, and popularity levels
 */
function generateRoundCombinations(
  round: number,
  genreIds: number[]
): Array<{
  genres?: number[];
  yearRange?: number[];
  keywordIds?: number[];
  popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
}> {
  const combinations: Array<{
    genres?: number[];
    yearRange?: number[];
    keywordIds?: number[];
    popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
  }> = [];

  // Use round number as seed for deterministic but varied combinations
  // Each round will have different category focuses
  const roundSeed = round - 1; // 0 to (SUGGEST_MOVIE_ROUNDS - 1)

  // Popular genres to use (common, well-represented genres)
  const popularGenres = [
    28, // Action
    35, // Comedy
    18, // Drama
    14, // Fantasy
    27, // Horror
    878, // Sci-Fi
    53, // Thriller
    16, // Animation
    10749, // Romance
    80, // Crime
  ];

  // Select genres based on round
  const genreGroups = [
    [popularGenres[roundSeed % popularGenres.length]],
    [
      popularGenres[roundSeed % popularGenres.length],
      popularGenres[(roundSeed + 1) % popularGenres.length],
    ],
    [popularGenres[(roundSeed + 2) % popularGenres.length]],
    [
      popularGenres[(roundSeed + 3) % popularGenres.length],
      popularGenres[(roundSeed + 4) % popularGenres.length],
    ],
  ];

  // Select moods based on round (vary across rounds)
  const moodOptions = MOVIE_VIBES.map((m) => m.id);
  const selectedMoods = [
    moodOptions[(roundSeed * 4) % moodOptions.length],
    moodOptions[(roundSeed * 4 + 1) % moodOptions.length],
    moodOptions[(roundSeed * 4 + 2) % moodOptions.length],
    moodOptions[(roundSeed * 4 + 3) % moodOptions.length],
  ];

  // Select eras based on round
  const eraOptions = ERA_OPTIONS.map((e) => e.value);
  const selectedEras = [
    eraOptions[(roundSeed * 2) % eraOptions.length],
    eraOptions[(roundSeed * 2 + 1) % eraOptions.length],
    eraOptions[(roundSeed * 2 + 2) % eraOptions.length],
    eraOptions[(roundSeed * 2 + 3) % eraOptions.length],
  ];

  // Popularity levels
  const popularityLevels: Array<"HIGH" | "AVERAGE" | "LOW"> = ["HIGH", "AVERAGE", "LOW"];

  // Generate 4 combinations deterministically based on round
  // Each combination will always have the same categories for the same round
  for (let i = 0; i < 4; i++) {
    const combo: {
      genres?: number[];
      yearRange?: number[];
      keywordIds?: number[];
      popularityLevel?: "HIGH" | "AVERAGE" | "LOW";
    } = {
      genres: genreGroups[i],
    };

    // Deterministically include mood (keyword) based on round and position
    // Pattern: include mood for positions 0, 1, 3 (75% coverage)
    if (i !== 2) {
      const moodId = selectedMoods[i];
      const moodKeywords = MOOD_TO_KEYWORDS[moodId];
      if (moodKeywords && moodKeywords.length > 0) {
        // Use first keyword from mood
        combo.keywordIds = [moodKeywords[0]];
      }
    }

    // Deterministically include era (year range) based on round and position
    // Pattern: include era for positions 0, 2, 3 (75% coverage)
    if (i !== 1) {
      const eraId = selectedEras[i];
      const yearRange = getEraYearRange(eraId);
      if (yearRange) {
        combo.yearRange = yearRange;
      }
    }

    // Deterministically include popularity level based on round and position
    // Pattern: include popularity for positions 1, 3 (50% coverage)
    if (i === 1 || i === 3) {
      combo.popularityLevel = popularityLevels[(roundSeed + i) % popularityLevels.length];
    }

    combinations.push(combo);
  }

  return combinations;
}

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

        // Apply collection filtering if provided
        const user = context.user;
        let inCollectionIds: Set<number> | null = null;
        let excludeCollectionIds: Set<number> | null = null;
        let allCollectionMovieIds: Set<number> | null = null;

        if (user) {
          if (args.inCollections && args.inCollections.length > 0) {
            const movieIds = await getMovieIdsFromCollections(
              context.prisma,
              user.id,
              args.inCollections
            );
            inCollectionIds = new Set(movieIds);
          }

          if (args.excludeCollections && args.excludeCollections.length > 0) {
            const movieIds = await getMovieIdsFromCollections(
              context.prisma,
              user.id,
              args.excludeCollections
            );
            excludeCollectionIds = new Set(movieIds);
          }

          if (args.notInAnyCollection) {
            const movieIds = await getAllMovieIdsInCollections(
              context.prisma,
              user.id
            );
            allCollectionMovieIds = new Set(movieIds);
          }
        }

        // Apply collection filtering
        if (inCollectionIds || excludeCollectionIds || args.notInAnyCollection) {
          tmdbMovies = filterMoviesByCollections(
            tmdbMovies as Array<{ id: number }>,
            inCollectionIds,
            excludeCollectionIds,
            args.notInAnyCollection || false,
            allCollectionMovieIds
          );
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
        // Get collection analysis if requested
        let collectionAnalysis: {
          genres?: number[];
          keywords?: number[];
          actors?: number[];
          crew?: number[];
          yearRange?: number[];
        } = {};

        if (args.filterByCollectionAnalysis && context.user) {
          collectionAnalysis = await getCollectionAnalysisForFiltering(
            args.filterByCollectionAnalysis,
            context,
            10
          );
        }

        // Filter cast to only actors (merge with collection analysis)
        const allActorIds = [
          ...(args.cast || []),
          ...(collectionAnalysis.actors || []),
        ];
        const actorIds = allActorIds.length > 0
          ? await context.tmdb.filterToActorsOnly(allActorIds)
          : undefined;

        // Filter crew to only directors/writers (merge with collection analysis)
        const allCrewIds = [
          ...(args.crew || []),
          ...(collectionAnalysis.crew || []),
        ];
        const crewIds = allCrewIds.length > 0
          ? await context.tmdb.filterToCrewOnly(allCrewIds)
          : undefined;

        // Merge collection analysis with explicit filters (explicit filters take precedence)
        const discoverParams = buildDiscoverParams({
          genres: args.genres || collectionAnalysis.genres,
          yearRange: args.yearRange || collectionAnalysis.yearRange,
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
          keywords: args.keywordIds || collectionAnalysis.keywords,
        });
        
        // Build options with popularity range if provided (from range or level)
        const popularityRange = args.popularityRange || 
          (args.popularityLevel ? getPopularityRange(args.popularityLevel) : undefined);
        const options = convertGraphQLOptionsToTMDBOptions({
          ...args.options,
          popularityGte: popularityRange?.[0],
          popularityLte: popularityRange?.[1],
        });
        
        let tmdbMovies = await context.tmdb.discoverMovies(
          discoverParams,
          options
        );

        // Apply collection filtering if provided
        const user = context.user;
        let inCollectionIds: Set<number> | null = null;
        let excludeCollectionIds: Set<number> | null = null;
        let allCollectionMovieIds: Set<number> | null = null;

        if (user) {
          if (args.inCollections && args.inCollections.length > 0) {
            const movieIds = await getMovieIdsFromCollections(
              context.prisma,
              user.id,
              args.inCollections
            );
            inCollectionIds = new Set(movieIds);
          }

          if (args.excludeCollections && args.excludeCollections.length > 0) {
            const movieIds = await getMovieIdsFromCollections(
              context.prisma,
              user.id,
              args.excludeCollections
            );
            excludeCollectionIds = new Set(movieIds);
          }

          if (args.notInAnyCollection) {
            const movieIds = await getAllMovieIdsInCollections(
              context.prisma,
              user.id
            );
            allCollectionMovieIds = new Set(movieIds);
          }
        }

        // Apply collection filtering
        if (inCollectionIds || excludeCollectionIds || args.notInAnyCollection) {
          tmdbMovies = filterMoviesByCollections(
            tmdbMovies as Array<{ id: number }>,
            inCollectionIds,
            excludeCollectionIds,
            args.notInAnyCollection || false,
            allCollectionMovieIds
          );
        }

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
        // Validate that movie IDs are provided
        if (!args.selectedMovieIds || args.selectedMovieIds.length === 0) {
          throw new Error("At least one movie ID must be provided");
        }

        // Get suggest history to exclude from results
        const historyIds = context.user
          ? await getSuggestHistory(context.prisma, context.user.id)
          : [];
        const historySet = new Set(historyIds);
        
        // Exclude selected movies from results
        const selectedMovieIdsSet = new Set(args.selectedMovieIds);

        // Extract categories from selected movies
        const prefs = await extractCategoriesFromMovies(
          args.selectedMovieIds,
          context
        );

        const options = convertGraphQLOptionsToTMDBOptions(prefs.options);

        // Build a simpler, less restrictive query
        // Strategy: Use fewer filters at once, prioritize genres and year range
        // We don't use actors/crew filters to keep queries less restrictive
        let tmdbMovies: unknown[] = [];
        let attempts = 0;

        // Try different combinations, starting with simpler queries
        const queryStrategies: Array<() => Partial<{ genres?: number[]; keywords?: number[]; yearRange?: number[] }>> = [
          // Strategy 1: Genres + Year Range (most common, least restrictive)
          () => ({
            genres: prefs.genres && prefs.genres.length > 0 ? prefs.genres.slice(0, 2) : undefined,
            yearRange: prefs.yearRange,
          }),
          // Strategy 2: Genres + Keywords (thematic match)
          () => ({
            genres: prefs.genres && prefs.genres.length > 0 ? prefs.genres.slice(0, 2) : undefined,
            keywords: prefs.keywordIds && prefs.keywordIds.length > 0 ? prefs.keywordIds.slice(0, 3) : undefined,
          }),
          // Strategy 3: Just top genre + year range
          () => ({
            genres: prefs.genres && prefs.genres.length > 0 ? [prefs.genres[0]] : undefined,
            yearRange: prefs.yearRange,
          }),
          // Strategy 4: Genres only
          () => ({
            genres: prefs.genres && prefs.genres.length > 0 ? prefs.genres.slice(0, 2) : undefined,
          }),
          // Strategy 5: Keywords + Year Range
          () => ({
            keywords: prefs.keywordIds && prefs.keywordIds.length > 0 ? prefs.keywordIds.slice(0, 3) : undefined,
            yearRange: prefs.yearRange,
          }),
          // Strategy 6: Just top genre
          () => ({
            genres: prefs.genres && prefs.genres.length > 0 ? [prefs.genres[0]] : undefined,
          }),
          // Strategy 7: Year range only
          () => ({
            yearRange: prefs.yearRange,
          }),
        ];

        // Try each strategy until we get results
        while (tmdbMovies.length === 0 && attempts < queryStrategies.length) {
          const strategy = queryStrategies[attempts];
          const filters = strategy();
          
          // Only include non-empty filters
          const discoverFilters: DiscoverFilters = {};
          if (filters.genres) discoverFilters.genres = filters.genres;
          if (filters.keywords) discoverFilters.keywordIds = filters.keywords;
          if (filters.yearRange) discoverFilters.yearRange = filters.yearRange;

          // Skip if no filters to use
          if (Object.keys(discoverFilters).length === 0) {
            attempts++;
            continue;
          }

          const discoverParams = buildDiscoverParams(discoverFilters, false);
          const discoveredMovies = await context.tmdb.discoverMovies(discoverParams, options);
          
          // Filter out movies from suggest history and selected movies
          tmdbMovies = (discoveredMovies as Array<{ id: number }>).filter(
            (movie) => !historySet.has(movie.id) && !selectedMovieIdsSet.has(movie.id)
          );
          
          attempts++;
        }

        // If still no results, try with just year range or random popular movies
        if (tmdbMovies.length === 0) {
          // Last resort: try with just year range if available
          if (prefs.yearRange) {
            const discoverParams = buildDiscoverParams({ yearRange: prefs.yearRange }, false);
            const discoveredMovies = await context.tmdb.discoverMovies(discoverParams, options);
            // Filter out movies from suggest history and selected movies
            tmdbMovies = (discoveredMovies as Array<{ id: number }>).filter(
              (movie) => !historySet.has(movie.id) && !selectedMovieIdsSet.has(movie.id)
            );
          }
          
          // If still no results, get a random popular movie (excluding history)
          if (tmdbMovies.length === 0) {
            let randomMovie: { id: number } | null = null;
            let retries = 0;
            const maxRetries = 20; // Try up to 20 times to find a movie not in history
            
            while (!randomMovie && retries < maxRetries) {
              const candidate = await context.tmdb.getRandomMovieFromSource(
                "popular",
                undefined,
                options
              );
              const movieId = (candidate as { id: number }).id;
              
              if (!historySet.has(movieId) && !selectedMovieIdsSet.has(movieId)) {
                randomMovie = candidate as { id: number };
              }
              retries++;
            }
            
            if (!randomMovie) {
              // If we can't find a movie not in history/selected, try a few more times with any movie
              // but still exclude selected movies
              let fallbackRetries = 0;
              const maxFallbackRetries = 10;
              while (!randomMovie && fallbackRetries < maxFallbackRetries) {
                const candidate = await context.tmdb.getRandomMovieFromSource(
                  "popular",
                  undefined,
                  options
                ) as { id: number };
                
                // Still exclude selected movies even in fallback
                if (!selectedMovieIdsSet.has(candidate.id)) {
                  randomMovie = candidate;
                }
                fallbackRetries++;
              }
              
              // Last resort: if we still can't find one, return any movie (should be very rare)
              if (!randomMovie) {
                randomMovie = await context.tmdb.getRandomMovieFromSource(
                  "popular",
                  undefined,
                  options
                ) as { id: number };
              }
            }
            
            const movieId = randomMovie.id;
            const fullMovie = await context.tmdb.getMovie(movieId, options);
            const result = transformTMDBMovie(fullMovie as TMDBMovieResponse);
            
            // Save to history if user is authenticated
            if (context.user) {
              await addToSuggestHistory(context.prisma, context.user.id, result.id);
            }
            
            return result;
          }
        }

        // Randomize page selection for more variety
        // If we have results, pick a random one
        const selectedMovie = pickRandomItem(tmdbMovies) as { id: number };
        
        // Fetch full movie details including videos/trailer
        const fullMovie = await context.tmdb.getMovie(selectedMovie.id, options);
        const result = transformTMDBMovie(fullMovie as TMDBMovieResponse);
        
        // Save to suggest history if user is authenticated
        if (context.user) {
          await addToSuggestHistory(context.prisma, context.user.id, result.id);
        }
        
        return result;
      } catch (error) {
        throw handleError(error, "Failed to suggest movie");
      }
    },

    suggestMovieRound: async (
      _parent: unknown,
      args: SuggestMovieRoundArgs,
      context: Context
    ): Promise<Movie[]> => {
      try {
        const { round } = args;
        
        // Validate round number
        if (round < 1 || round > SUGGEST_MOVIE_ROUNDS) {
          throw new Error(`Round must be between 1 and ${SUGGEST_MOVIE_ROUNDS}`);
        }

        // Get suggest history to exclude from results
        const historyIds = context.user
          ? await getSuggestHistory(context.prisma, context.user.id)
          : [];
        const historySet = new Set(historyIds);

        // Get available genres
        const allGenres = await context.tmdb.getGenres();
        const genreIds = allGenres.map((g) => g.id);

        // Generate 4 diverse category combinations for this round
        // Each combination represents different genres, moods, eras, and popularity levels
        const combinations = generateRoundCombinations(round, genreIds);

        // Fetch movies for each combination in parallel
        const moviePromises = combinations.map(async (combo) => {
          try {
            // Build discover params for this combination
            const discoverFilters = {
              genres: combo.genres,
              yearRange: combo.yearRange,
              keywords: combo.keywordIds,
              popularityLevel: combo.popularityLevel,
            };

            const discoverParams = buildDiscoverParams(discoverFilters, false);
            const options = convertGraphQLOptionsToTMDBOptions({
              voteAverageGte: 5.0, // Minimum quality threshold
              voteCountGte: 50, // Minimum votes for reliability
            });

            // Discover movies with this combination
            let discoveredMovies = await context.tmdb.discoverMovies(discoverParams, options);
            // Filter out movies from suggest history
            let tmdbMovies = (discoveredMovies as Array<{ id: number }>).filter(
              (movie) => !historySet.has(movie.id)
            );

            // If no results, try with fewer constraints
            if (tmdbMovies.length === 0 && combo.genres && combo.genres.length > 1) {
              // Try with just the first genre
              const fallbackParams = buildDiscoverParams(
                { ...discoverFilters, genres: [combo.genres[0]] },
                false
              );
              const fallbackDiscovered = await context.tmdb.discoverMovies(fallbackParams, options);
              // Filter out movies from suggest history
              tmdbMovies = (fallbackDiscovered as Array<{ id: number }>).filter(
                (movie) => !historySet.has(movie.id)
              );
            }

            // If still no results, try with just genres (no other filters)
            if (tmdbMovies.length === 0 && combo.genres && combo.genres.length > 0) {
              const genreOnlyParams = buildDiscoverParams({ genres: combo.genres }, false);
              const genreDiscovered = await context.tmdb.discoverMovies(genreOnlyParams, options);
              // Filter out movies from suggest history
              tmdbMovies = (genreDiscovered as Array<{ id: number }>).filter(
                (movie) => !historySet.has(movie.id)
              );
            }

            // Pick a random movie from results
            if (tmdbMovies.length > 0) {
              const selectedMovie = pickRandomItem(tmdbMovies) as { id: number };
              // Fetch full movie details
              const fullMovie = await context.tmdb.getMovie(selectedMovie.id, options);
              return transformTMDBMovie(fullMovie as TMDBMovieResponse);
            }

            return null;
          } catch (error) {
            // If one combination fails, return null (will be filtered out)
            return null;
          }
        });

        // Wait for all movies to be fetched
        const movies = await Promise.all(moviePromises);
        
        // Filter out null results and ensure we have at least some movies
        const validMovies = movies.filter((m): m is Movie => m !== null);

        if (validMovies.length === 0) {
          // Fallback: return 4 random movies from popular sources (excluding history)
          const fallbackOptions = convertGraphQLOptionsToTMDBOptions({
            voteAverageGte: 5.0,
            voteCountGte: 50,
          });
          
          const fallbackResults: Movie[] = [];
          const sources = ["popular", "top_rated", "trending", "now_playing"] as const;
          let retries = 0;
          const maxRetries = 40; // Try up to 40 times to find 4 movies not in history
          
          while (fallbackResults.length < 4 && retries < maxRetries) {
            const sourceIndex = retries % sources.length;
            const source = sources[sourceIndex];
            const timeWindow = source === "trending" ? "day" : undefined;
            
            try {
              const randomMovie = await context.tmdb.getRandomMovieFromSource(
                source,
                timeWindow,
                fallbackOptions
              );
              const movieId = (randomMovie as { id: number }).id;
              
              // Skip if in history
              if (historySet.has(movieId)) {
                retries++;
                continue;
              }
              
              // Check if already added
              if (fallbackResults.some((m) => m.id === movieId)) {
                retries++;
                continue;
              }
              
              const fullMovie = await context.tmdb.getMovie(movieId, fallbackOptions);
              const transformed = transformTMDBMovie(fullMovie as TMDBMovieResponse);
              fallbackResults.push(transformed);
            } catch (error) {
              // If one source fails, continue with others
            }
            
            retries++;
          }
          
          // If we still don't have 4 movies, fill with any movies (even if in history)
          if (fallbackResults.length < 4) {
            const remaining = 4 - fallbackResults.length;
            for (let i = 0; i < remaining; i++) {
              try {
                const source = sources[i % sources.length];
                const timeWindow = source === "trending" ? "day" : undefined;
                const randomMovie = await context.tmdb.getRandomMovieFromSource(
                  source,
                  timeWindow,
                  fallbackOptions
                );
                const movieId = (randomMovie as { id: number }).id;
                
                // Check if already added
                if (fallbackResults.some((m) => m.id === movieId)) {
                  continue;
                }
                
                const fullMovie = await context.tmdb.getMovie(movieId, fallbackOptions);
                const transformed = transformTMDBMovie(fullMovie as TMDBMovieResponse);
                fallbackResults.push(transformed);
              } catch (error) {
                // Continue if one fails
              }
            }
          }

          return fallbackResults.slice(0, 4);
        }

        // If we have fewer than 4 movies, fill with random popular movies (excluding history)
        const fillOptions = convertGraphQLOptionsToTMDBOptions({
          voteAverageGte: 5.0,
          voteCountGte: 50,
        });
        
        let fillRetries = 0;
        const maxFillRetries = 20; // Try up to 20 times to find movies not in history
        
        while (validMovies.length < 4 && fillRetries < maxFillRetries) {
          try {
            const randomMovie = await context.tmdb.getRandomMovieFromSource(
              "popular",
              undefined,
              fillOptions
            );
            const movieId = (randomMovie as { id: number }).id;
            
            // Skip if in history or already added
            if (historySet.has(movieId) || validMovies.some((m) => m.id === movieId)) {
              fillRetries++;
              continue;
            }
            
            const fullMovie = await context.tmdb.getMovie(movieId, fillOptions);
            const transformed = transformTMDBMovie(fullMovie as TMDBMovieResponse);
            validMovies.push(transformed);
          } catch (error) {
            // If we can't get more movies, break
            break;
          }
          fillRetries++;
        }
        
        // If we still need more movies, allow history movies (but avoid duplicates)
        while (validMovies.length < 4) {
          try {
            const randomMovie = await context.tmdb.getRandomMovieFromSource(
              "popular",
              undefined,
              fillOptions
            );
            const movieId = (randomMovie as { id: number }).id;
            
            // Only check for duplicates now
            if (validMovies.some((m) => m.id === movieId)) {
              continue;
            }
            
            const fullMovie = await context.tmdb.getMovie(movieId, fillOptions);
            const transformed = transformTMDBMovie(fullMovie as TMDBMovieResponse);
            validMovies.push(transformed);
          } catch (error) {
            // If we can't get more movies, break
            break;
          }
        }

        return validMovies.slice(0, 4);
      } catch (error) {
        throw handleError(error, "Failed to get suggest movie round");
      }
    },

    suggestMovieRounds: async (
      _parent: unknown,
      _args: unknown,
      _context: Context
    ): Promise<number> => {
      return SUGGEST_MOVIE_ROUNDS;
    },

    suggestHistory: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ): Promise<Movie[]> => {
      try {
        if (!context.user) {
          throw new Error("Authentication required");
        }

        // Get suggest history movie IDs
        const historyIds = await getSuggestHistory(context.prisma, context.user.id);

        if (historyIds.length === 0) {
          return [];
        }

        // Fetch full movie details for each history entry
        const options = convertGraphQLOptionsToTMDBOptions({});
        const moviePromises = historyIds.map((tmdbId) =>
          context.tmdb.getMovie(tmdbId, options).catch(() => null)
        );

        const movies = await Promise.all(moviePromises);

        // Filter out null results and transform
        const validMovies = movies
          .filter((m): m is TMDBMovieResponse => m !== null)
          .map((m) => transformTMDBMovie(m));

        return validMovies;
      } catch (error) {
        throw handleError(error, "Failed to get suggest history");
      }
    },

    shuffleMovie: async (
      _parent: unknown,
      args: ShuffleMovieArgs,
      context: Context
    ): Promise<Movie | null> => {
      try {
        // Get collection analysis if requested (before checking hasAnyParams)
        let collectionAnalysis: {
          genres?: number[];
          keywords?: number[];
          actors?: number[];
          crew?: number[];
          yearRange?: number[];
        } = {};

        if (args.filterByCollectionAnalysis && context.user) {
          collectionAnalysis = await getCollectionAnalysisForFiltering(
            args.filterByCollectionAnalysis,
            context,
            10
          );
        }

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
          args.filterByCollectionAnalysis ||
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

          // Merge collection analysis with randomArgs (if collection analysis was requested)
          const mergedGenres = randomArgs.genres || collectionAnalysis.genres;
          const mergedYearRange = randomArgs.yearRange || collectionAnalysis.yearRange;
          const mergedKeywords = randomArgs.keywordIds || collectionAnalysis.keywords;
          const mergedActors = [
            ...(randomArgs.cast || []),
            ...(collectionAnalysis.actors || []),
          ];
          const mergedCrew = [
            ...(randomArgs.crew || []),
            ...(collectionAnalysis.crew || []),
          ];

          // Filter cast to only actors and crew to only directors/writers
          const actorIds = mergedActors.length > 0
            ? await context.tmdb.filterToActorsOnly(mergedActors)
            : undefined;
          const crewIds = mergedCrew.length > 0
            ? await context.tmdb.filterToCrewOnly(mergedCrew)
            : undefined;

          // Build discover params with all filters (using randomArgs if generated, merged with collection analysis)
          // yearRange should be [minYear, maxYear] format
          discoverFilters = {
            genres: mergedGenres,
            yearRange: mergedYearRange,
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
            keywords: mergedKeywords,
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
      collectionAnalysis.yearRange ||
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
      collectionAnalysis.keywords ||
      args.filterByCollectionAnalysis ||
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

