/**
 * Movie-related TMDB API methods
 */

import { TMDBOptions } from "../../types";
import { TMDBClient } from "./client";
import { DiscoverParams, DEFAULT_SORT_BY, CACHE_TTL } from "./types";

export class MovieMethods extends TMDBClient {
  /**
   * Get a single movie by TMDB ID (with caching)
   * Also fetches videos and credits to include trailer and cast/crew information
   */
  async getMovie(movieId: number, options?: TMDBOptions, includeCredits: boolean = true) {
    // Only cache if no special options (options might change results)
    const shouldCache = !options || Object.keys(options).length === 0;

    const getMovieData = async () => {
      // Fetch movie, videos, and credits in parallel for detail page
      const [movieData, videosData, creditsData] = await Promise.all([
        this.makeRequest<Record<string, unknown>>(
          `/movie/${movieId}`,
          this.buildRequestParams(options),
          "Failed to fetch movie from TMDB"
        ),
        this.getMovieVideos(movieId).catch(() => ({ results: [] })), // Gracefully handle video fetch errors
        includeCredits
          ? this.getMovieCredits(movieId).catch(() => ({ cast: [], crew: [] })) // Gracefully handle credits fetch errors
          : Promise.resolve({ cast: [], crew: [] }),
      ]);

      // Combine movie data with videos and credits
      return {
        ...movieData,
        videos: videosData.results || [],
        credits: creditsData,
      };
    };

    if (shouldCache) {
      return this.getCachedOrRequest(
        "movie",
        this.movieCache,
        movieId,
        CACHE_TTL.MOVIE,
        getMovieData
      );
    }

    return getMovieData();
  }

  /**
   * Get movie keywords by movie ID (with caching)
   */
  async getMovieKeywords(movieId: number) {
    return this.getCachedOrRequest(
      "movie_keywords",
      this.movieKeywordsCache,
      movieId,
      CACHE_TTL.MOVIE_CREDITS, // Use same TTL as credits
      () =>
        this.makeRequest<{
          keywords?: Array<{ id: number; name: string }>;
        }>(
          `/movie/${movieId}/keywords`,
          this.buildRequestParams(),
          "Failed to fetch movie keywords from TMDB"
        )
    );
  }

  /**
   * Get movie videos (trailers, teasers, etc.) by movie ID (with caching)
   */
  async getMovieVideos(movieId: number) {
    return this.getCachedOrRequest(
      "movie_videos",
      this.movieVideosCache,
      movieId,
      CACHE_TTL.MOVIE_CREDITS, // Use same TTL as credits
      () =>
        this.makeRequest<{
          results?: Array<{
            id: string;
            iso_639_1?: string;
            iso_3166_1?: string;
            key: string;
            name: string;
            official?: boolean;
            published_at?: string;
            site: string;
            size?: number;
            type: string;
          }>;
        }>(
          `/movie/${movieId}/videos`,
          this.buildRequestParams(),
          "Failed to fetch movie videos from TMDB"
        )
    );
  }

  /**
   * Search movies by query string
   * TMDB's search API automatically performs case-insensitive partial matching (like ILIKE)
   * Results are cached for 5 minutes to reduce API calls
   */
  async searchMovies(query: string, limit?: number, options?: TMDBOptions) {
    // Normalize query for caching (trim, lowercase)
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `search_${normalizedQuery}_${JSON.stringify(options || {})}`;
    
    // Check cache first
    if (this.searchCache && this.isCacheValid(this.searchCache.get(cacheKey))) {
      const cached = this.searchCache.get(cacheKey)!;
      const results = cached.data as unknown[];
      return limit ? results.slice(0, limit) : results;
    }

    // Make API request
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/search/movie",
      {
        query: query.trim(), // TMDB handles fuzzy matching automatically
        ...this.buildRequestParams(options),
        page: 1, // Limit to first page for efficiency
      },
      "Failed to search movies from TMDB"
    );

    const results = response.results || [];
    
    // Cache results (limit to first 20 for cache efficiency)
    const resultsToCache = results.slice(0, 20);
    if (!this.searchCache) {
      this.searchCache = new Map();
    }
    this.searchCache.set(cacheKey, {
      data: resultsToCache,
      timestamp: Date.now(),
      ttl: CACHE_TTL.SEARCH,
    });

    // Apply limit if specified
    return limit ? results.slice(0, Math.min(limit, 100)) : results;
  }

  /**
   * Discover movies with filters and options
   * Note: TMDB uses genre IDs, not names (e.g., "28" for Action)
   */
  async discoverMovies(params?: DiscoverParams, options?: TMDBOptions) {
    const requestParams: Record<string, unknown> = {
      ...this.buildRequestParams(options),
      ...this.buildDiscoverParams(params),
      sort_by: options?.sortBy || DEFAULT_SORT_BY,
    };

    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/discover/movie",
      requestParams,
      "Failed to discover movies from TMDB"
    );
    
    return response.results || [];
  }

  /**
   * Get a random movie from discover endpoint
   * Randomizes across all available pages for better distribution
   * Uses caching to reduce API calls
   */
  async getRandomMovie(options?: TMDBOptions) {
    const baseParams = this.buildRequestParams(options);
    const sortBy = options?.sortBy || DEFAULT_SORT_BY;

    // Create cache key for discover endpoint
    const cacheKey = `page_metadata_discover_${JSON.stringify({ ...baseParams, sort_by: sortBy })}`;

    // Get page metadata (cached if available)
    const { totalPages, firstPageResults } = await this.getPageMetadata(
      "/discover/movie",
      {
        ...baseParams,
        sort_by: sortBy,
      },
      cacheKey
    );

    // If no pages or no results, throw error
    if (totalPages === 0 || firstPageResults.length === 0) {
      throw new Error("No movies found");
    }

    // If only one page, pick from first page results
    if (totalPages === 1) {
      return this.pickRandomItem(firstPageResults);
    }

    // Randomize page selection (1 to totalPages)
    const randomPage = this.getRandomPage(totalPages);

    // If we randomly selected page 1, use the cached results
    if (randomPage === 1) {
      return this.pickRandomItem(firstPageResults);
    }

    // Otherwise, fetch the randomly selected page
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/discover/movie",
      {
        ...baseParams,
        sort_by: sortBy,
        page: randomPage,
      },
      "Failed to get random movie from TMDB"
    );

    const movies = (response.results || []) as unknown[];
    if (movies.length === 0) {
      // Fallback: if random page has no results, use first page
      return this.pickRandomItem(firstPageResults);
    }

    return this.pickRandomItem(movies);
  }

  /**
   * Get trending movies
   * @param timeWindow - "day" or "week" (default: "day")
   * @param options - Optional TMDB options
   */
  async getTrendingMovies(
    timeWindow: "day" | "week" = "day",
    options?: TMDBOptions
  ) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      `/trending/movie/${timeWindow}`,
      this.buildRequestParams(options),
      "Failed to get trending movies from TMDB"
    );
    return response.results || [];
  }

  /**
   * Get now playing movies
   * @param options - Optional TMDB options
   */
  async getNowPlayingMovies(options?: TMDBOptions) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/movie/now_playing",
      this.buildRequestParams(options),
      "Failed to get now playing movies from TMDB"
    );
    return response.results || [];
  }

  /**
   * Get popular movies
   * @param options - Optional TMDB options
   */
  async getPopularMovies(options?: TMDBOptions) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/movie/popular",
      this.buildRequestParams(options),
      "Failed to get popular movies from TMDB"
    );
    return response.results || [];
  }

  /**
   * Get top rated movies
   * @param options - Optional TMDB options
   */
  async getTopRatedMovies(options?: TMDBOptions) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/movie/top_rated",
      this.buildRequestParams(options),
      "Failed to get top rated movies from TMDB"
    );
    return response.results || [];
  }

  /**
   * Get upcoming movies
   * @param options - Optional TMDB options
   */
  async getUpcomingMovies(options?: TMDBOptions) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/movie/upcoming",
      this.buildRequestParams(options),
      "Failed to get upcoming movies from TMDB"
    );
    return response.results || [];
  }

  /**
   * Get page metadata (total pages and first page results) with caching
   * This reduces API calls by caching the total pages count
   */
  private async getPageMetadata(
    endpoint: string,
    params: Record<string, unknown>,
    cacheKey: string
  ): Promise<{ totalPages: number; firstPageResults: unknown[] }> {
    // Check cache first
    const cached = this.pageMetadataCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached.data;
    }

    // Fetch first page to get metadata
    const response = await this.makeRequest<{
      total_pages?: number;
      results?: unknown[];
    }>(
      endpoint,
      { ...params, page: 1 },
      "Failed to get page metadata"
    );

    const totalPages = this.getTotalPages(response);
    const firstPageResults = (response.results || []) as unknown[];

    const metadata = { totalPages, firstPageResults };

    // Cache the metadata
    this.pageMetadataCache.set(cacheKey, {
      data: metadata,
      timestamp: Date.now(),
      ttl: CACHE_TTL.PAGE_METADATA,
    });

    return metadata;
  }

  /**
   * Get a random movie from trending, now playing, popular, top rated, or upcoming
   * Randomizes across all available pages for better distribution
   * Uses caching to reduce API calls
   * @param source - Which source to use: "trending", "now_playing", "popular", "top_rated", or "upcoming"
   * @param timeWindow - For trending: "day" or "week" (default: "day")
   * @param options - Optional TMDB options
   */
  async getRandomMovieFromSource(
    source: "trending" | "now_playing" | "popular" | "top_rated" | "upcoming",
    timeWindow: "day" | "week" = "day",
    options?: TMDBOptions
  ) {
    const baseParams = this.buildRequestParams(options);
    const sortBy = options?.sortBy || DEFAULT_SORT_BY;

    // Determine endpoint based on source
    let endpoint: string;
    if (source === "trending") {
      endpoint = `/trending/movie/${timeWindow}`;
    } else {
      endpoint = `/movie/${source}`;
    }

    // Create cache key based on source, timeWindow, and options
    const cacheKey = `page_metadata_${endpoint}_${JSON.stringify({ ...baseParams, ...(source !== "trending" && { sort_by: sortBy }) })}`;

    // Get page metadata (cached if available)
    const { totalPages, firstPageResults } = await this.getPageMetadata(
      endpoint,
      {
        ...baseParams,
        ...(source !== "trending" && { sort_by: sortBy }),
      },
      cacheKey
    );

    // If no pages or no results, throw error
    if (totalPages === 0 || firstPageResults.length === 0) {
      throw new Error(`No movies found in ${source}`);
    }

    // If only one page, pick from first page results
    if (totalPages === 1) {
      return this.pickRandomItem(firstPageResults);
    }

    // Randomize page selection (1 to totalPages)
    // Use better randomization: weight towards middle pages slightly to avoid always getting popular items
    const randomPage = this.getRandomPage(totalPages);

    // If we randomly selected page 1, use the cached results
    if (randomPage === 1) {
      return this.pickRandomItem(firstPageResults);
    }

    // Otherwise, fetch the randomly selected page
    const response = await this.makeRequest<{ results?: unknown[] }>(
      endpoint,
      {
        ...baseParams,
        ...(source !== "trending" && { sort_by: sortBy }),
        page: randomPage,
      },
      `Failed to get random movie from ${source}`
    );

    const movies = (response.results || []) as unknown[];
    if (movies.length === 0) {
      // Fallback: if random page has no results, use first page
      return this.pickRandomItem(firstPageResults);
    }

    return this.pickRandomItem(movies);
  }

  /**
   * Get a random actor from trending, now playing, popular, top rated, or upcoming movies
   * Optimized to retry with a different movie if the first one has no actors
   * @param source - Which source to use: "trending", "now_playing", "popular", "top_rated", or "upcoming"
   * @param timeWindow - For trending: "day" or "week" (default: "day")
   * @param options - Optional TMDB options
   * @param maxRetries - Maximum number of retries if movie has no actors (default: 3)
   */
  async getRandomActorFromSource(
    source: "trending" | "now_playing" | "popular" | "top_rated" | "upcoming",
    timeWindow: "day" | "week" = "day",
    options?: TMDBOptions,
    maxRetries: number = 3
  ) {
    let attempts = 0;
    const seenMovieIds = new Set<number>();

    while (attempts < maxRetries) {
      // Get a random movie from the source
      const randomMovie = await this.getRandomMovieFromSource(
        source,
        timeWindow,
        options
      );

      const movieId = (randomMovie as { id: number }).id;

      // Skip if we've already tried this movie
      if (seenMovieIds.has(movieId)) {
        attempts++;
        continue;
      }
      seenMovieIds.add(movieId);

      try {
        // Get credits for the random movie (uses caching)
        const credits = await this.getMovieCredits(movieId);

        // Extract actors from cast
        const cast = (credits.cast || []) as Array<{
          id: number;
          name: string;
          profile_path?: string;
        }>;

        if (cast.length > 0) {
          // Pick a random actor from the cast
          return this.pickRandomItem(cast);
        }
      } catch (error) {
        // If credits fetch fails, try another movie
      }

      attempts++;
    }

    throw new Error(`No actors found after ${maxRetries} attempts from ${source}`);
  }

  /**
   * Search keywords by query string (smart search with fuzzy matching)
   * TMDB automatically performs case-insensitive partial matching
   * Results are cached for 24 hours to reduce API calls
   */
  async searchKeywords(query: string, limit?: number) {
    // Normalize query for caching (trim, lowercase)
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `search_keyword_${normalizedQuery}`;
    
    // Check cache first (using searchCache)
    if (this.searchCache && this.isCacheValid(this.searchCache.get(cacheKey))) {
      const cached = this.searchCache.get(cacheKey)!;
      const results = cached.data as unknown[];
      return limit ? results.slice(0, limit) : results;
    }

    // Make API request
    const response = await this.makeRequest<{ results?: Array<{ id: number; name: string }> }>(
      "/search/keyword",
      {
        query: query.trim(), // TMDB handles fuzzy matching automatically
        page: 1, // Limit to first page for efficiency
      },
      "Failed to search keywords from TMDB"
    );

    const results = response.results || [];
    
    // Cache results (limit to first 20 for cache efficiency)
    const resultsToCache = results.slice(0, 20);
    if (!this.searchCache) {
      this.searchCache = new Map();
    }
    this.searchCache.set(cacheKey, {
      data: resultsToCache,
      timestamp: Date.now(),
      ttl: CACHE_TTL.SEARCH * 24, // Cache keywords for 24 hours (longer than movie search)
    });

    // Apply limit if specified
    return limit ? results.slice(0, Math.min(limit, 100)) : results;
  }

  /**
   * Get movie genres list (with caching)
   */
  async getGenres() {
    if (this.isCacheValid(this.genresCache)) {
      return this.genresCache.data;
    }

    const response = await this.makeRequest<{
      genres?: Array<{ id: number; name: string }>;
    }>(
      "/genre/movie/list",
      this.buildRequestParams(),
      "Failed to get genres from TMDB"
    );

    const genres = response.genres || [];
    this.genresCache = {
      data: genres,
      timestamp: Date.now(),
      ttl: CACHE_TTL.GENRES,
    };

    return genres;
  }

  /**
   * Get movie credits (cast and crew) by movie ID (with caching)
   */
  async getMovieCredits(movieId: number) {
    return this.getCachedOrRequest(
      "movie_credits",
      this.movieCreditsCache,
      movieId,
      CACHE_TTL.MOVIE_CREDITS,
      () =>
        this.makeRequest<{
          cast?: Array<{ id: number; name: string; profile_path?: string }>;
          crew?: Array<{
            id: number;
            name: string;
            job?: string;
            department?: string;
            profile_path?: string;
          }>;
        }>(
          `/movie/${movieId}/credits`,
          this.buildRequestParams(),
          "Failed to get movie credits from TMDB"
        )
    );
  }

  /**
   * Extract unique actors from a list of movies (parallelized)
   */
  async extractActorsFromMovies(
    movieIds: number[]
  ): Promise<Array<{ id: number; name: string; profile_path?: string }>> {
    const actorsMap = new Map<
      number,
      { id: number; name: string; profile_path?: string }
    >();

    // Limit to first 20 movies to avoid too many API calls
    const limitedMovieIds = movieIds.slice(0, 20);

    if (limitedMovieIds.length === 0) return [];

    // Process in parallel with batching
    const batchSize = 5;
    const results = await Promise.allSettled(
      Array.from(
        { length: Math.ceil(limitedMovieIds.length / batchSize) },
        (_, i) => {
          const batch = limitedMovieIds.slice(
            i * batchSize,
            (i + 1) * batchSize
          );
          return Promise.all(
            batch.map(async (movieId) => {
              try {
                const credits = await this.getMovieCredits(movieId);
                return { movieId, credits };
              } catch {
                return { movieId, credits: null };
              }
            })
          );
        }
      )
    );

    // Process results
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        result.value.forEach(({ credits }) => {
          if (credits?.cast) {
            // Get top 5 cast members per movie
            const cast = credits.cast as Array<{
              id: number;
              name: string;
              profile_path?: string;
            }>;
            cast.slice(0, 5).forEach((actor) => {
              if (!actorsMap.has(actor.id)) {
                actorsMap.set(actor.id, {
                  id: actor.id,
                  name: actor.name,
                  profile_path: actor.profile_path,
                });
              }
            });
          }
        });
      }
    });

    return Array.from(actorsMap.values());
  }

  /**
   * Extract unique directors/writers from a list of movies (parallelized)
   */
  async extractCrewFromMovies(
    movieIds: number[]
  ): Promise<Array<{ id: number; name: string; profile_path?: string }>> {
    const crewMap = new Map<
      number,
      { id: number; name: string; profile_path?: string }
    >();

    // Limit to first 20 movies to avoid too many API calls
    const limitedMovieIds = movieIds.slice(0, 20);

    if (limitedMovieIds.length === 0) return [];

    // Process in parallel with batching
    const batchSize = 5;
    const results = await Promise.allSettled(
      Array.from(
        { length: Math.ceil(limitedMovieIds.length / batchSize) },
        (_, i) => {
          const batch = limitedMovieIds.slice(
            i * batchSize,
            (i + 1) * batchSize
          );
          return Promise.all(
            batch.map(async (movieId) => {
              try {
                const credits = await this.getMovieCredits(movieId);
                return { movieId, credits };
              } catch {
                return { movieId, credits: null };
              }
            })
          );
        }
      )
    );

    // Process results
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        result.value.forEach(({ credits }) => {
          if (credits?.crew) {
            const crew = credits.crew as Array<{
              id: number;
              name: string;
              job?: string;
              department?: string;
              profile_path?: string;
            }>;
            crew
              .filter(
                (member) =>
                  member.job === "Director" ||
                  member.department === "Directing" ||
                  member.job === "Writer" ||
                  member.department === "Writing" ||
                  member.job === "Screenplay" ||
                  member.job === "Story"
              )
              .forEach((member) => {
                if (!crewMap.has(member.id)) {
                  crewMap.set(member.id, {
                    id: member.id,
                    name: member.name,
                    profile_path: member.profile_path,
                  });
                }
              });
          }
        });
      }
    });

    return Array.from(crewMap.values());
  }
}

