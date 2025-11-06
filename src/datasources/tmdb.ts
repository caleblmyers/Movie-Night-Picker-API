import axios, { AxiosInstance } from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

  async getMovie(movieId: number) {
    try {
      const response = await this.client.get(`/movie/${movieId}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to fetch movie from TMDB: ${error.message || 'Unknown error'}`);
    }
  }

  async searchMovies(query: string) {
    try {
      const response = await this.client.get('/search/movie', {
        params: {
          query,
        },
      });
      return response.data.results || [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to search movies from TMDB: ${error.message || 'Unknown error'}`);
    }
  }

  async discoverMovies(params?: {
    genres?: string[];
    yearRange?: number[];
    actors?: number[];
  }) {
    try {
      const requestParams: Record<string, any> = {
        sort_by: 'popularity.desc', // Sort by popularity by default
      };

      if (params?.genres && params.genres.length > 0) {
        // Note: TMDB uses genre IDs, not names. This would need genre name to ID mapping
        // For now, assuming genres are passed as IDs (e.g., "28" for Action)
        requestParams.with_genres = params.genres.join(',');
      }

      if (params?.yearRange && params.yearRange.length === 2) {
        requestParams['primary_release_date.gte'] = `${params.yearRange[0]}-01-01`;
        requestParams['primary_release_date.lte'] = `${params.yearRange[1]}-12-31`;
      }

      // Support for actors (cast members) - uses TMDB's with_cast parameter
      if (params?.actors && params.actors.length > 0) {
        requestParams.with_cast = params.actors.join(',');
      }

      const response = await this.client.get('/discover/movie', {
        params: requestParams,
      });
      return response.data.results || [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to discover movies from TMDB: ${error.message || 'Unknown error'}`);
    }
  }

  async getPerson(personId: number) {
    try {
      const response = await this.client.get(`/person/${personId}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to fetch person from TMDB: ${error.message || 'Unknown error'}`);
    }
  }

  async searchPeople(query: string) {
    try {
      const response = await this.client.get('/search/person', {
        params: {
          query,
        },
      });
      return response.data.results || [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to search people from TMDB: ${error.message || 'Unknown error'}`);
    }
  }

  async getRandomMovie() {
    try {
      // First, get the total number of pages available
      const firstPageResponse = await this.client.get('/discover/movie', {
        params: {
          sort_by: 'popularity.desc',
          page: 1,
        },
      });

      const totalPages = Math.min(firstPageResponse.data.total_pages || 500, 500); // TMDB limits to 500 pages
      
      // Pick a random page
      const randomPage = Math.floor(Math.random() * totalPages) + 1;

      // Get movies from the random page
      const response = await this.client.get('/discover/movie', {
        params: {
          sort_by: 'popularity.desc',
          page: randomPage,
        },
      });

      const movies = response.data.results || [];
      if (movies.length === 0) {
        throw new Error('No movies found');
      }

      // Pick a random movie from the page
      const randomIndex = Math.floor(Math.random() * movies.length);
      return movies[randomIndex];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to get random movie from TMDB: ${error.message || 'Unknown error'}`);
    }
  }

  async getRandomPerson() {
    try {
      // First, get the total number of pages available for popular people
      const firstPageResponse = await this.client.get('/person/popular', {
        params: {
          page: 1,
        },
      });

      const totalPages = Math.min(firstPageResponse.data.total_pages || 500, 500); // TMDB limits to 500 pages
      
      // Pick a random page
      const randomPage = Math.floor(Math.random() * totalPages) + 1;

      // Get people from the random page
      const response = await this.client.get('/person/popular', {
        params: {
          page: randomPage,
        },
      });

      const people = response.data.results || [];
      if (people.length === 0) {
        throw new Error('No people found');
      }

      // Pick a random person from the page
      const randomIndex = Math.floor(Math.random() * people.length);
      return people[randomIndex];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `TMDB API error: ${error.response.status} - ${error.response.data?.status_message || error.message}`
        );
      }
      throw new Error(`Failed to get random person from TMDB: ${error.message || 'Unknown error'}`);
    }
  }
}

