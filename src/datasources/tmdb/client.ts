/**
 * Base TMDB client with caching and request utilities
 */

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { handleTMDBError } from "../../utils/tmdbErrorHandler";
import { TMDBOptions } from "../../types";
import {
  TMDB_BASE_URL,
  DEFAULT_REGION,
  DEFAULT_LANGUAGE,
  DEFAULT_SORT_BY,
  DEFAULT_INCLUDE_ADULT,
  CACHE_TTL,
  CacheEntry,
  DiscoverParams,
} from "./types";

export class TMDBClient {
  protected client: AxiosInstance;
  protected apiKey: string;

  // In-memory caches
  protected genresCache: CacheEntry<Array<{ id: number; name: string }>> | null = null;
  protected movieCreditsCache = new Map<
    number,
    CacheEntry<{
      cast?: unknown[];
      crew?: Array<{ job?: string; department?: string }>;
    }>
  >();
  protected movieVideosCache = new Map<
    number,
    CacheEntry<{
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
    }>
  >();
  protected personCreditsCache = new Map<
    number,
    CacheEntry<{
      cast?: unknown[];
      crew?: Array<{ job?: string; department?: string }>;
    }>
  >();
  protected movieCache = new Map<number, CacheEntry<unknown>>();
  protected personCache = new Map<number, CacheEntry<unknown>>();
  protected searchCache = new Map<string, CacheEntry<unknown[]>>();

  // Request deduplication - prevent duplicate concurrent requests
  protected pendingRequests = new Map<string, Promise<unknown>>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: TMDB_BASE_URL,
      params: {
        api_key: this.apiKey,
      },
    });
  }

  /**
   * Check if cache entry is still valid
   */
  protected isCacheValid<T>(
    entry: CacheEntry<T> | null | undefined
  ): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get from cache or execute request (with deduplication)
   */
  protected async getCachedOrRequest<T>(
    cacheKey: string,
    cache: Map<number, CacheEntry<T>> | null,
    id: number | null,
    ttl: number,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check cache first
    if (cache && id !== null) {
      const cached = cache.get(id);
      if (this.isCacheValid(cached)) {
        return cached.data;
      }
    }

    // Check if request is already pending (deduplication)
    const pendingKey = `${cacheKey}_${id || "global"}`;
    if (this.pendingRequests.has(pendingKey)) {
      return (await this.pendingRequests.get(pendingKey)) as T;
    }

    // Make request and cache it
    const requestPromise = requestFn()
      .then((data) => {
        if (cache && id !== null) {
          cache.set(id, { data, timestamp: Date.now(), ttl });
        }
        this.pendingRequests.delete(pendingKey);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(pendingKey);
        throw error;
      });

    this.pendingRequests.set(pendingKey, requestPromise);
    return requestPromise;
  }

  /**
   * Build request parameters with defaults from TMDB options
   */
  protected buildRequestParams(options?: TMDBOptions): Record<string, unknown> {
    return {
      region: options?.region || DEFAULT_REGION,
      language: options?.language || DEFAULT_LANGUAGE,
      ...(options?.page && { page: options.page }),
      ...(options?.sortBy && { sort_by: options.sortBy }),
      ...(options?.year && { year: options.year }),
      ...(options?.primaryReleaseYear && {
        primary_release_year: options.primaryReleaseYear,
      }),
      ...(options?.voteAverageGte !== undefined && {
        "vote_average.gte": options.voteAverageGte,
      }),
      ...(options?.voteCountGte !== undefined && {
        "vote_count.gte": options.voteCountGte,
      }),
      ...(options?.withOriginalLanguage && {
        with_original_language: options.withOriginalLanguage,
      }),
      ...(options?.withWatchProviders && {
        with_watch_providers: options.withWatchProviders,
      }),
      include_adult: options?.includeAdult ?? DEFAULT_INCLUDE_ADULT,
    };
  }

  /**
   * Build discover-specific parameters from filters
   */
  protected buildDiscoverParams(params?: DiscoverParams): Record<string, unknown> {
    const discoverParams: Record<string, unknown> = {};

    if (params?.genres && params.genres.length > 0) {
      // Convert genre IDs to strings for TMDB API
      // Using comma (,) for AND logic - movie must have ALL specified genres
      discoverParams.with_genres = params.genres.map(String).join(",");
    }

    if (params?.yearRange && params.yearRange.length === 2) {
      const startYear = params.yearRange[0];
      const endYear = params.yearRange[1];
      discoverParams["primary_release_date.gte"] = `${startYear}-01-01`;
      discoverParams["primary_release_date.lte"] = `${endYear}-12-31`;
    }

    if (params?.actors && params.actors.length > 0) {
      // Using comma (,) for AND logic - movie must have ALL specified actors
      discoverParams.with_cast = params.actors.join(",");
    }

    if (params?.crew && params.crew.length > 0) {
      // TMDB uses with_crew parameter for crew members
      // Using comma (,) for AND logic - movie must have ALL specified crew members
      discoverParams.with_crew = params.crew.join(",");
    }

    if (params?.keywords && params.keywords.length > 0) {
      // TMDB uses with_keywords parameter for keywords
      discoverParams.with_keywords = params.keywords.join(",");
    }

    if (params?.runtimeRange && params.runtimeRange.length === 2) {
      // TMDB uses with_runtime_gte and with_runtime_lte for runtime filtering (in minutes)
      discoverParams.with_runtime_gte = params.runtimeRange[0];
      discoverParams.with_runtime_lte = params.runtimeRange[1];
    }

    return discoverParams;
  }

  /**
   * Generic API request handler with error handling
   */
  protected async makeRequest<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    errorMessage: string = "Failed to fetch from TMDB"
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, {
        params,
      });
      return response.data;
    } catch (error: unknown) {
      throw handleTMDBError(error, errorMessage);
    }
  }

  /**
   * Get total pages from a paginated response, capped at MAX_PAGES
   */
  protected getTotalPages(response: { total_pages?: number }): number {
    const { MAX_PAGES } = require("./types");
    return Math.min(response.total_pages || MAX_PAGES, MAX_PAGES);
  }

  /**
   * Get a random page number between 1 and totalPages
   */
  protected getRandomPage(totalPages: number): number {
    return Math.floor(Math.random() * totalPages) + 1;
  }

  /**
   * Pick a random item from an array
   */
  protected pickRandomItem<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick random item from empty array");
    }
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
  }
}

