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
   * Search people by query string
   */
  async searchPeople(query: string) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/search/person",
      { query },
      "Failed to search people from TMDB"
    );
    return response.results || [];
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

