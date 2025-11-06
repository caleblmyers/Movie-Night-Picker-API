import { Context } from "../context";

export interface Movie {
  id: number;
  title: string;
  overview?: string | null;
  posterUrl?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

export interface Person {
  id: number;
  name: string;
  biography?: string | null;
  profileUrl?: string | null;
  birthday?: string | null;
  placeOfBirth?: string | null;
  knownForDepartment?: string | null;
  popularity?: number | null;
}

// Transform TMDB movie data to our GraphQL Movie type
function transformTMDBMovie(tmdbMovie: any): Movie {
  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title,
    overview: tmdbMovie.overview || null,
    posterUrl: tmdbMovie.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : null,
    releaseDate: tmdbMovie.release_date || null,
    voteAverage: tmdbMovie.vote_average || null,
    voteCount: tmdbMovie.vote_count || null,
  };
}

// Transform TMDB person data to our GraphQL Person type
function transformTMDBPerson(tmdbPerson: any): Person {
  return {
    id: tmdbPerson.id,
    name: tmdbPerson.name,
    biography: tmdbPerson.biography || null,
    profileUrl: tmdbPerson.profile_path
      ? `https://image.tmdb.org/t/p/w500${tmdbPerson.profile_path}`
      : null,
    birthday: tmdbPerson.birthday || null,
    placeOfBirth: tmdbPerson.place_of_birth || null,
    knownForDepartment: tmdbPerson.known_for_department || null,
    popularity: tmdbPerson.popularity || null,
  };
}

export const resolvers = {
  Query: {
    // Get a single movie by TMDB ID
    getMovie: async (
      _: any,
      args: { id: number },
      context: Context
    ): Promise<Movie> => {
      try {
        const tmdbMovie = await context.tmdb.getMovie(args.id);
        return transformTMDBMovie(tmdbMovie);
      } catch (error) {
        throw new Error(
          `Failed to fetch movie: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Search movies by query string
    searchMovies: async (
      _: any,
      args: { query: string },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const tmdbMovies = await context.tmdb.searchMovies(args.query);
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw new Error(
          `Failed to search movies: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Discover movies with filters
    discoverMovies: async (
      _: any,
      args: { genres?: string[]; yearRange?: number[]; cast?: number[] },
      context: Context
    ): Promise<Movie[]> => {
      try {
        const tmdbMovies = await context.tmdb.discoverMovies({
          genres: args.genres,
          yearRange: args.yearRange,
          actors: args.cast, // Map cast to actors for TMDB API
        });
        return tmdbMovies.map(transformTMDBMovie);
      } catch (error) {
        throw new Error(
          `Failed to discover movies: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Suggest a movie based on user selections from 5 rounds of choices
    // Accepts MoviePreferencesInput with genres, actors (person IDs), and yearRange
    // Returns a single random movie from the filtered results
    // If no results found with multiple genres/actors, tries again with only one of each
    suggestMovie: async (
      _: any,
      args: { preferences?: { genres?: string[]; actors?: number[]; yearRange?: number[] } },
      context: Context
    ): Promise<Movie> => {
      try {
        const prefs = args.preferences || {};

        // Build discover parameters from user selections
        const buildDiscoverParams = (useSingle: boolean = false) => {
          const discoverParams: {
            genres?: string[];
            yearRange?: number[];
            actors?: number[];
          } = {};

          // Use single genre/actor if fallback is needed, otherwise use all
          if (prefs.genres && prefs.genres.length > 0) {
            discoverParams.genres = useSingle ? [prefs.genres[0]] : prefs.genres;
          }

          if (prefs.yearRange && prefs.yearRange.length === 2) {
            discoverParams.yearRange = prefs.yearRange;
          }

          if (prefs.actors && prefs.actors.length > 0) {
            discoverParams.actors = useSingle ? [prefs.actors[0]] : prefs.actors;
          }

          return discoverParams;
        };

        // First attempt: try with all provided genres and actors
        let discoverParams = buildDiscoverParams(false);
        let tmdbMovies = await context.tmdb.discoverMovies(discoverParams);

        // If no results and we have multiple genres or actors, try with only one of each
        if (tmdbMovies.length === 0) {
          const hasMultipleGenres = prefs.genres && prefs.genres.length > 1;
          const hasMultipleActors = prefs.actors && prefs.actors.length > 1;

          if (hasMultipleGenres || hasMultipleActors) {
            // Fallback: try with only the first genre and/or first actor
            discoverParams = buildDiscoverParams(true);
            tmdbMovies = await context.tmdb.discoverMovies(discoverParams);
          }
        }

        if (tmdbMovies.length === 0) {
          throw new Error(
            "No movies found matching your selections. Try different criteria."
          );
        }

        // Pick a random movie from the filtered results
        const randomIndex = Math.floor(Math.random() * tmdbMovies.length);
        return transformTMDBMovie(tmdbMovies[randomIndex]);
      } catch (error) {
        throw new Error(
          `Failed to suggest movie: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Shuffle/random movie (uses discover and returns one random result)
    // Accepts optional genres, yearRange, and cast members (actors)
    // If no results with multiple genres/cast, tries again with only one of each
    shuffleMovie: async (
      _: any,
      args: { genres?: string[]; yearRange?: number[]; cast?: number[] },
      context: Context
    ): Promise<Movie> => {
      try {
        // Build discover parameters from provided filters
        const buildDiscoverParams = (useSingle: boolean = false) => {
          const discoverParams: {
            genres?: string[];
            yearRange?: number[];
            actors?: number[];
          } = {};

          // Use single genre/actor if fallback is needed, otherwise use all
          if (args.genres && args.genres.length > 0) {
            discoverParams.genres = useSingle ? [args.genres[0]] : args.genres;
          }

          if (args.yearRange && args.yearRange.length === 2) {
            discoverParams.yearRange = args.yearRange;
          }

          if (args.cast && args.cast.length > 0) {
            discoverParams.actors = useSingle ? [args.cast[0]] : args.cast;
          }

          return discoverParams;
        };

        // First attempt: try with all provided genres and cast members
        let discoverParams = buildDiscoverParams(false);
        let tmdbMovies = await context.tmdb.discoverMovies(discoverParams);

        // If no results and we have multiple genres or cast members, try with only one of each
        if (tmdbMovies.length === 0) {
          const hasMultipleGenres = args.genres && args.genres.length > 1;
          const hasMultipleCast = args.cast && args.cast.length > 1;

          if (hasMultipleGenres || hasMultipleCast) {
            // Fallback: try with only the first genre and/or first cast member
            discoverParams = buildDiscoverParams(true);
            tmdbMovies = await context.tmdb.discoverMovies(discoverParams);
          }
        }

        if (tmdbMovies.length === 0) {
          throw new Error("No movies found matching the criteria");
        }

        // Pick a random movie from the filtered results
        const randomIndex = Math.floor(Math.random() * tmdbMovies.length);
        return transformTMDBMovie(tmdbMovies[randomIndex]);
      } catch (error) {
        throw new Error(
          `Failed to shuffle movie: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Get a single person by TMDB ID
    getPerson: async (
      _: any,
      args: { id: number },
      context: Context
    ): Promise<Person> => {
      try {
        const tmdbPerson = await context.tmdb.getPerson(args.id);
        return transformTMDBPerson(tmdbPerson);
      } catch (error) {
        throw new Error(
          `Failed to fetch person: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Search people by query string
    searchPeople: async (
      _: any,
      args: { query: string },
      context: Context
    ): Promise<Person[]> => {
      try {
        const tmdbPeople = await context.tmdb.searchPeople(args.query);
        return tmdbPeople.map(transformTMDBPerson);
      } catch (error) {
        throw new Error(
          `Failed to search people: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Get a completely random movie
    randomMovie: async (_: any, __: any, context: Context): Promise<Movie> => {
      try {
        const tmdbMovie = await context.tmdb.getRandomMovie();
        return transformTMDBMovie(tmdbMovie);
      } catch (error) {
        throw new Error(
          `Failed to get random movie: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },

    // Get a completely random person
    randomPerson: async (
      _: any,
      __: any,
      context: Context
    ): Promise<Person> => {
      try {
        const tmdbPerson = await context.tmdb.getRandomPerson();
        return transformTMDBPerson(tmdbPerson);
      } catch (error) {
        throw new Error(
          `Failed to get random person: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  },
};
