import axios, { AxiosInstance, AxiosResponse } from "axios";
import { handleTMDBError } from "../utils/tmdbErrorHandler";
import { TMDBOptions } from "../types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const MAX_PAGES = 500; // TMDB API limit

// Default TMDB options
const DEFAULT_REGION = "US";
const DEFAULT_LANGUAGE = "en-US";
const DEFAULT_SORT_BY = "popularity.desc";
const DEFAULT_PAGE = 1;
const DEFAULT_INCLUDE_ADULT = false;

interface DiscoverParams {
  genres?: number[];
  yearRange?: number[];
  actors?: number[];
  crew?: number[];
  keywords?: number[];
}

export class TMDBDataSource {
  private client: AxiosInstance;
  private apiKey: string;

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
   * Build request parameters with defaults from TMDB options
   */
  private buildRequestParams(options?: TMDBOptions): Record<string, unknown> {
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
  private buildDiscoverParams(params?: DiscoverParams): Record<string, unknown> {
    const discoverParams: Record<string, unknown> = {};

      if (params?.genres && params.genres.length > 0) {
        // Convert genre IDs to strings for TMDB API
        discoverParams.with_genres = params.genres.map(String).join(",");
      }

    if (params?.yearRange && params.yearRange.length === 2) {
      discoverParams["primary_release_date.gte"] = `${params.yearRange[0]}-01-01`;
      discoverParams["primary_release_date.lte"] = `${params.yearRange[1]}-12-31`;
    }

    if (params?.actors && params.actors.length > 0) {
      discoverParams.with_cast = params.actors.join(",");
    }

    if (params?.crew && params.crew.length > 0) {
      // TMDB uses with_crew parameter for crew members
      discoverParams.with_crew = params.crew.join(",");
    }

    if (params?.keywords && params.keywords.length > 0) {
      // TMDB uses with_keywords parameter for keywords
      discoverParams.with_keywords = params.keywords.join(",");
    }

    return discoverParams;
  }

  /**
   * Filter person IDs to only include actors
   */
  async filterToActorsOnly(personIds: number[]): Promise<number[]> {
    const actorIds: number[] = [];

    for (const personId of personIds) {
      if (await this.isActor(personId)) {
        actorIds.push(personId);
      }
    }

    return actorIds;
  }

  /**
   * Filter person IDs to only include directors/writers
   */
  async filterToCrewOnly(personIds: number[]): Promise<number[]> {
    const crewIds: number[] = [];

    for (const personId of personIds) {
      if (await this.isDirectorOrWriter(personId)) {
        crewIds.push(personId);
      }
    }

    return crewIds;
  }

  /**
   * Generic API request handler with error handling
   */
  private async makeRequest<T>(
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
  private getTotalPages(response: { total_pages?: number }): number {
    return Math.min(response.total_pages || MAX_PAGES, MAX_PAGES);
  }

  /**
   * Get a random page number between 1 and totalPages
   */
  private getRandomPage(totalPages: number): number {
    return Math.floor(Math.random() * totalPages) + 1;
  }

  /**
   * Pick a random item from an array
   */
  private pickRandomItem<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick random item from empty array");
    }
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
  }

  /**
   * Get a single movie by TMDB ID
   */
  async getMovie(movieId: number, options?: TMDBOptions) {
    return this.makeRequest(
      `/movie/${movieId}`,
      this.buildRequestParams(options),
      "Failed to fetch movie from TMDB"
    );
  }

  /**
   * Search movies by query string
   */
  async searchMovies(query: string, options?: TMDBOptions) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      "/search/movie",
      {
        query,
        ...this.buildRequestParams(options),
      },
      "Failed to search movies from TMDB"
    );
    return response.results || [];
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
   * Get a single person by TMDB ID
   */
  async getPerson(personId: number) {
    return this.makeRequest(
      `/person/${personId}`,
      undefined,
      "Failed to fetch person from TMDB"
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
   * Get combined credits (cast and crew) for a person
   */
  async getPersonCombinedCredits(personId: number) {
    return this.makeRequest<{
      cast?: unknown[];
      crew?: Array<{
        job?: string;
        department?: string;
      }>;
    }>(
      `/person/${personId}/combined_credits`,
      undefined,
      "Failed to get person combined credits from TMDB"
    );
  }

  /**
   * Check if a person has actor credits (appears in cast)
   */
  async isActor(personId: number): Promise<boolean> {
    try {
      const credits = await this.getPersonCombinedCredits(personId);
      return !!(credits.cast && credits.cast.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Check if a person has director/writer credits
   */
  async isDirectorOrWriter(personId: number): Promise<boolean> {
    try {
      const credits = await this.getPersonCombinedCredits(personId);
      if (!credits.crew || credits.crew.length === 0) {
        return false;
      }

      return credits.crew.some(
        (credit) =>
          credit.job === "Director" ||
          credit.department === "Directing" ||
          credit.job === "Writer" ||
          credit.department === "Writing" ||
          credit.job === "Screenplay" ||
          credit.job === "Story"
      );
    } catch {
      return false;
    }
  }

  /**
   * Filter people by role type (actor, crew, or both)
   */
  async filterPeopleByRole(
    people: Array<{ id: number }>,
    roleType: "actor" | "crew" | "both"
  ): Promise<Array<{ id: number }>> {
    if (roleType === "both") {
      return people;
    }

    const filtered: Array<{ id: number }> = [];

    for (const person of people) {
      const isActorRole = await this.isActor(person.id);
      const isCrewRole = await this.isDirectorOrWriter(person.id);

      if (roleType === "actor" && isActorRole) {
        filtered.push(person);
      } else if (roleType === "crew" && isCrewRole) {
        filtered.push(person);
      }
    }

    return filtered;
  }

  /**
   * Get a random movie from discover endpoint
   */
  async getRandomMovie(options?: TMDBOptions) {
    const baseParams = this.buildRequestParams(options);
    const sortBy = options?.sortBy || DEFAULT_SORT_BY;

    // Get total pages available
    const firstPageResponse = await this.makeRequest<{ total_pages?: number }>(
      "/discover/movie",
      {
        ...baseParams,
        sort_by: sortBy,
        page: 1,
      },
      "Failed to get random movie from TMDB"
    );

    const totalPages = this.getTotalPages(firstPageResponse);
    const randomPage = this.getRandomPage(totalPages);

    // Get movies from random page
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
      throw new Error("No movies found");
    }

    return this.pickRandomItem(movies);
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
   * Get trending people
   * @param timeWindow - "day" or "week" (default: "day")
   * @param options - Optional TMDB options
   */
  async getTrendingPeople(
    timeWindow: "day" | "week" = "day",
    options?: TMDBOptions
  ) {
    const response = await this.makeRequest<{ results?: unknown[] }>(
      `/trending/person/${timeWindow}`,
      this.buildRequestParams(options),
      "Failed to get trending people from TMDB"
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
   * Get movie genres list
   */
  async getGenres() {
    const response = await this.makeRequest<{ genres?: Array<{ id: number; name: string }> }>(
      "/genre/movie/list",
      this.buildRequestParams(),
      "Failed to get genres from TMDB"
    );
    return response.genres || [];
  }

  /**
   * Get movie credits (cast and crew) by movie ID
   */
  async getMovieCredits(movieId: number) {
    return this.makeRequest<{
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
    );
  }

  /**
   * Extract unique actors from a list of movies
   */
  async extractActorsFromMovies(movieIds: number[]): Promise<Array<{ id: number; name: string; profile_path?: string }>> {
    const actorsMap = new Map<number, { id: number; name: string; profile_path?: string }>();

    // Limit to first 20 movies to avoid too many API calls
    const limitedMovieIds = movieIds.slice(0, 20);

    for (const movieId of limitedMovieIds) {
      try {
        const credits = await this.getMovieCredits(movieId);
        if (credits.cast) {
          // Get top 5 cast members per movie
          credits.cast.slice(0, 5).forEach((actor) => {
            if (!actorsMap.has(actor.id)) {
              actorsMap.set(actor.id, {
                id: actor.id,
                name: actor.name,
                profile_path: actor.profile_path,
              });
            }
          });
        }
      } catch {
        // Skip movies that fail to load credits
        continue;
      }
    }

    return Array.from(actorsMap.values());
  }

  /**
   * Extract unique directors/writers from a list of movies
   */
  async extractCrewFromMovies(movieIds: number[]): Promise<Array<{ id: number; name: string; profile_path?: string }>> {
    const crewMap = new Map<number, { id: number; name: string; profile_path?: string }>();

    // Limit to first 20 movies to avoid too many API calls
    const limitedMovieIds = movieIds.slice(0, 20);

    for (const movieId of limitedMovieIds) {
      try {
        const credits = await this.getMovieCredits(movieId);
        if (credits.crew) {
          credits.crew
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
      } catch {
        // Skip movies that fail to load credits
        continue;
      }
    }

    return Array.from(crewMap.values());
  }
}
