import { Movie, Person } from "../types";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export interface TMDBMovieResponse {
  id: number;
  title: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
}

export interface TMDBPersonResponse {
  id: number;
  name: string;
  biography?: string | null;
  profile_path?: string | null;
  birthday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string | null;
  popularity?: number | null;
}

export function transformTMDBMovie(
  tmdbMovie: TMDBMovieResponse | { id: number }
): Movie {
  // Type guard for full movie response
  if ("title" in tmdbMovie) {
    return {
      id: tmdbMovie.id,
      title: tmdbMovie.title,
      overview: tmdbMovie.overview || null,
      posterUrl: tmdbMovie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${tmdbMovie.poster_path}`
        : null,
      releaseDate: tmdbMovie.release_date || null,
      voteAverage: tmdbMovie.vote_average || null,
      voteCount: tmdbMovie.vote_count || null,
    };
  }
  
  // Fallback for minimal movie object (shouldn't happen, but type-safe)
  return {
    id: tmdbMovie.id,
    title: "Unknown",
    overview: null,
    posterUrl: null,
    releaseDate: null,
    voteAverage: null,
    voteCount: null,
  };
}

export function transformTMDBPerson(
  tmdbPerson: TMDBPersonResponse | { id: number }
): Person {
  // Type guard for full person response
  if ("name" in tmdbPerson) {
    return {
      id: tmdbPerson.id,
      name: tmdbPerson.name,
      biography: tmdbPerson.biography || null,
      profileUrl: tmdbPerson.profile_path
        ? `${TMDB_IMAGE_BASE_URL}${tmdbPerson.profile_path}`
        : null,
      birthday: tmdbPerson.birthday || null,
      placeOfBirth: tmdbPerson.place_of_birth || null,
      knownForDepartment: tmdbPerson.known_for_department || null,
      popularity: tmdbPerson.popularity || null,
    };
  }
  
  // Fallback for minimal person object (shouldn't happen, but type-safe)
  return {
    id: tmdbPerson.id,
    name: "Unknown",
    biography: null,
    profileUrl: null,
    birthday: null,
    placeOfBirth: null,
    knownForDepartment: null,
    popularity: null,
  };
}
