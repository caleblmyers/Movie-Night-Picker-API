import { Movie, Person } from "../types";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export function transformTMDBMovie(tmdbMovie: any): Movie {
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

export function transformTMDBPerson(tmdbPerson: any): Person {
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
