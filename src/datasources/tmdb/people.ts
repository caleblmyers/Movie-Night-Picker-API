/**
 * Person-related TMDB API methods
 */

import { TMDBClient } from "./client";
import { CACHE_TTL } from "./types";

export class PeopleMethods extends TMDBClient {
  /**
   * Get a single person by TMDB ID (with caching)
   */
  async getPerson(personId: number) {
    return this.getCachedOrRequest(
      "person",
      this.personCache,
      personId,
      CACHE_TTL.PERSON,
      () =>
        this.makeRequest(
          `/person/${personId}`,
          undefined,
          "Failed to fetch person from TMDB"
        )
    );
  }

  /**
   * Search people by query string (smart search with fuzzy matching)
   * TMDB automatically performs case-insensitive partial matching
   * Results are cached for 5 minutes to reduce API calls
   */
  async searchPeople(query: string, limit?: number, options?: import("../../types").TMDBOptions) {
    // Normalize query for caching (trim, lowercase)
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `search_person_${normalizedQuery}_${JSON.stringify(options || {})}`;
    
    // Check cache first
    if (this.searchCache && this.isCacheValid(this.searchCache.get(cacheKey))) {
      const cached = this.searchCache.get(cacheKey)!;
      const results = cached.data as unknown[];
      return limit ? results.slice(0, limit) : results;
    }

    // Make API request
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/search/person",
      {
        query: query.trim(), // TMDB handles fuzzy matching automatically
        ...this.buildRequestParams(options),
        page: 1, // Limit to first page for efficiency
      },
      "Failed to search people from TMDB"
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
   * Get a random person from popular people endpoint
   */
  async getRandomPerson() {
    // Get total pages available
    const firstPageResponse = await this.makeRequest<{ total_pages?: number }>(
      "/person/popular",
      { page: 1 },
      "Failed to get random person from TMDB"
    );

    const totalPages = this.getTotalPages(firstPageResponse);
    const randomPage = this.getRandomPage(totalPages);

    // Get people from random page
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/person/popular",
      { page: randomPage },
      "Failed to get random person from TMDB"
    );

    const people = (response.results || []) as unknown[];
    if (people.length === 0) {
      throw new Error("No people found");
    }

    return this.pickRandomItem(people);
  }

  /**
   * Get trending people
   * @param timeWindow - "day" or "week" (default: "day")
   * @param options - Optional TMDB options
   */
  async getTrendingPeople(
    timeWindow: "day" | "week" = "day",
    options?: import("../../types").TMDBOptions
  ) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      `/trending/person/${timeWindow}`,
      this.buildRequestParams(options),
      "Failed to get trending people from TMDB"
    );
    return response.results || [];
  }
}

