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
    } catch (error) {
      throw new Error(`Failed to fetch movie from TMDB: ${error}`);
    }
  }

  async searchMovies(query: string) {
    try {
      const response = await this.client.get('/search/movie', {
        params: {
          query,
        },
      });
      return response.data.results;
    } catch (error) {
      throw new Error(`Failed to search movies from TMDB: ${error}`);
    }
  }

  async discoverMovies(params?: {
    genres?: string[];
    yearRange?: number[];
    crew?: string[];
  }) {
    try {
      const requestParams: Record<string, any> = {};

      if (params?.genres && params.genres.length > 0) {
        // Note: TMDB uses genre IDs, not names. This would need genre name to ID mapping
        requestParams.with_genres = params.genres.join(',');
      }

      if (params?.yearRange && params.yearRange.length === 2) {
        requestParams['primary_release_date.gte'] = `${params.yearRange[0]}-01-01`;
        requestParams['primary_release_date.lte'] = `${params.yearRange[1]}-12-31`;
      }

      const response = await this.client.get('/discover/movie', {
        params: requestParams,
      });
      return response.data.results;
    } catch (error) {
      throw new Error(`Failed to discover movies from TMDB: ${error}`);
    }
  }
}

