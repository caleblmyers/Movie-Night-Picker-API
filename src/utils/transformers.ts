import { Movie, Person } from "../types";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export interface TMDBVideo {
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
}

export interface TMDBMovieResponse {
  id: number;
  title: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  // Videos can be either an array (from our getMovie method) or an object with results (from TMDB API)
  videos?: TMDBVideo[] | { results?: TMDBVideo[] };
  // Credits for detail page
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string | null;
      profile_path?: string | null;
      order?: number | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string | null;
      department?: string | null;
      profile_path?: string | null;
    }>;
  };
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

/**
 * Extract the best trailer from videos array
 * Priority: Official trailers > Non-official trailers > Teaser trailers
 */
export function extractTrailer(videos?: TMDBVideo[]): {
  key: string;
  site: string;
  name: string;
  type: string;
  url: string;
} | null {
  if (!videos || videos.length === 0) {
    return null;
  }

  // Filter for trailers and teasers
  const trailers = videos.filter(
    (video) =>
      video.type === "Trailer" || video.type === "Teaser"
  );

  if (trailers.length === 0) {
    return null;
  }

  // Prefer official trailers, then any trailer, then teasers
  const officialTrailer = trailers.find(
    (video) => video.official && video.type === "Trailer"
  );
  if (officialTrailer) {
    return buildTrailerObject(officialTrailer);
  }

  const anyTrailer = trailers.find((video) => video.type === "Trailer");
  if (anyTrailer) {
    return buildTrailerObject(anyTrailer);
  }

  // Fallback to first teaser
  return buildTrailerObject(trailers[0]);
}

/**
 * Build trailer object with URL
 */
function buildTrailerObject(video: TMDBVideo): {
  key: string;
  site: string;
  name: string;
  type: string;
  url: string;
} {
  let url = "";
  if (video.site === "YouTube") {
    url = `https://www.youtube.com/watch?v=${video.key}`;
  } else if (video.site === "Vimeo") {
    url = `https://vimeo.com/${video.key}`;
  } else {
    // For other sites, use the key as-is
    url = video.key;
  }

  return {
    key: video.key,
    site: video.site,
    name: video.name,
    type: video.type,
    url,
  };
}

export function transformTMDBMovie(
  tmdbMovie: TMDBMovieResponse | { id: number }
): Movie {
  // Type guard for full movie response
  if ("title" in tmdbMovie) {
    // Extract trailer from videos
    // Handle both array format (from our getMovie) and object format (from TMDB API)
    let videos: TMDBVideo[] | undefined;
    if (Array.isArray(tmdbMovie.videos)) {
      videos = tmdbMovie.videos;
    } else if (tmdbMovie.videos && typeof tmdbMovie.videos === "object" && "results" in tmdbMovie.videos) {
      videos = tmdbMovie.videos.results;
    }
    const trailer = extractTrailer(videos);

    // Transform cast members
    const cast = tmdbMovie.credits?.cast
      ? tmdbMovie.credits.cast
          .slice(0, 20) // Limit to top 20 cast members
          .map((member) => ({
            id: member.id,
            name: member.name,
            character: member.character || null,
            profileUrl: member.profile_path
              ? `${TMDB_IMAGE_BASE_URL}${member.profile_path}`
              : null,
            order: member.order || null,
          }))
      : [];

    // Transform crew members (prioritize directors and writers)
    const crew = tmdbMovie.credits?.crew
      ? tmdbMovie.credits.crew
          .filter(
            (member) =>
              member.job === "Director" ||
              member.department === "Directing" ||
              member.job === "Writer" ||
              member.department === "Writing" ||
              member.job === "Screenplay" ||
              member.job === "Story" ||
              member.job === "Producer" ||
              member.department === "Production"
          )
          .slice(0, 15) // Limit to top 15 crew members
          .map((member) => ({
            id: member.id,
            name: member.name,
            job: member.job || null,
            department: member.department || null,
            profileUrl: member.profile_path
              ? `${TMDB_IMAGE_BASE_URL}${member.profile_path}`
              : null,
          }))
      : [];

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
      runtime: tmdbMovie.runtime || null,
      genres: tmdbMovie.genres || [],
      trailer,
      cast,
      crew,
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
    runtime: null,
    genres: [],
    trailer: null,
    cast: [],
    crew: [],
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
