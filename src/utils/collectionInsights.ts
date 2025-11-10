/**
 * Helper functions for calculating collection insights
 */

import { Context } from "../context";
import { transformTMDBMovie } from "./transformers";
import type { TMDBMovieResponse } from "./transformers";
import { Movie } from "../types";

interface GenreCount {
  genre: { id: number; name: string };
  count: number;
}

interface PersonCount {
  person: { id: number; name: string; profileUrl: string | null };
  count: number;
}

export interface CollectionInsightsData {
  totalMovies: number;
  uniqueGenres: number;
  moviesByGenre: GenreCount[];
  uniqueActors: number;
  topActors: PersonCount[];
  uniqueCrew: number;
  topCrew: PersonCount[];
  yearRange: { min: number; max: number } | null;
  averageRuntime: number | null;
  averageVoteAverage: number | null;
}

/**
 * Calculate insights for a collection
 */
export async function calculateCollectionInsights(
  collectionId: number,
  context: Context
): Promise<CollectionInsightsData> {
  // Get all movies in the collection
  const collectionMovies = await context.prisma.collectionMovie.findMany({
    where: { collectionId },
    select: { tmdbId: true },
  });

  if (collectionMovies.length === 0) {
    return {
      totalMovies: 0,
      uniqueGenres: 0,
      moviesByGenre: [],
      uniqueActors: 0,
      topActors: [],
      uniqueCrew: 0,
      topCrew: [],
      yearRange: null,
      averageRuntime: null,
      averageVoteAverage: null,
    };
  }

  // Fetch full movie details from TMDB (in batches to avoid overwhelming the API)
  const movieIds = collectionMovies.map((cm) => cm.tmdbId);
  const batchSize = 10;
  const movies: Movie[] = [];

  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const moviePromises = batch.map((id) =>
      context.tmdb
        .getMovie(id, undefined, true)
        .then((movie) => transformTMDBMovie(movie as TMDBMovieResponse))
        .catch(() => null)
    );
    const batchMovies = await Promise.all(moviePromises);
    movies.push(...(batchMovies.filter((m) => m !== null) as Movie[]));
  }

  // If no movies were successfully fetched, return empty insights
  if (movies.length === 0) {
    return {
      totalMovies: 0,
      uniqueGenres: 0,
      moviesByGenre: [],
      uniqueActors: 0,
      topActors: [],
      uniqueCrew: 0,
      topCrew: [],
      yearRange: null,
      averageRuntime: null,
      averageVoteAverage: null,
    };
  }

  // Calculate statistics
  const genreMap = new Map<number, { id: number; name: string; count: number }>();
  const actorMap = new Map<
    number,
    { id: number; name: string; profileUrl: string | null; count: number }
  >();
  const crewMap = new Map<
    number,
    { id: number; name: string; profileUrl: string | null; count: number }
  >();
  const years: number[] = [];
  const runtimes: number[] = [];
  const voteAverages: number[] = [];

  movies.forEach((movie) => {
    // Genres
    if (movie.genres) {
      movie.genres.forEach((genre) => {
        const existing = genreMap.get(genre.id);
        if (existing) {
          existing.count++;
        } else {
          genreMap.set(genre.id, {
            id: genre.id,
            name: genre.name,
            count: 1,
          });
        }
      });
    }

    // Actors
    if (movie.cast) {
      movie.cast.forEach((actor) => {
        const existing = actorMap.get(actor.id);
        if (existing) {
          existing.count++;
        } else {
          actorMap.set(actor.id, {
            id: actor.id,
            name: actor.name,
            profileUrl: actor.profileUrl ?? null,
            count: 1,
          });
        }
      });
    }

    // Crew (directors and writers)
    if (movie.crew) {
      movie.crew.forEach((member) => {
        // Only count directors and writers
        if (
          member.job === "Director" ||
          member.department === "Directing" ||
          member.job === "Writer" ||
          member.department === "Writing" ||
          member.job === "Screenplay" ||
          member.job === "Story"
        ) {
          const existing = crewMap.get(member.id);
          if (existing) {
            existing.count++;
          } else {
            crewMap.set(member.id, {
              id: member.id,
              name: member.name,
              profileUrl: member.profileUrl ?? null,
              count: 1,
            });
          }
        }
      });
    }

    // Year
    if (movie.releaseDate) {
      const year = new Date(movie.releaseDate).getFullYear();
      if (!isNaN(year)) {
        years.push(year);
      }
    }

    // Runtime
    if (movie.runtime) {
      runtimes.push(movie.runtime);
    }

    // Vote average
    if (movie.voteAverage !== null && movie.voteAverage !== undefined) {
      voteAverages.push(movie.voteAverage);
    }
  });

  // Sort and get top actors/crew
  const topActors = Array.from(actorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((actor) => ({
      person: {
        id: actor.id,
        name: actor.name,
        profileUrl: actor.profileUrl ?? null,
      },
      count: actor.count,
    }));

  const topCrew = Array.from(crewMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((crew) => ({
      person: {
        id: crew.id,
        name: crew.name,
        profileUrl: crew.profileUrl ?? null,
      },
      count: crew.count,
    }));

  // Calculate averages
  const averageRuntime =
    runtimes.length > 0
      ? runtimes.reduce((sum, r) => sum + r, 0) / runtimes.length
      : null;
  const averageVoteAverage =
    voteAverages.length > 0
      ? voteAverages.reduce((sum, v) => sum + v, 0) / voteAverages.length
      : null;

  // Year range
  const yearRange =
    years.length > 0
      ? { min: Math.min(...years), max: Math.max(...years) }
      : null;

  return {
    totalMovies: movies.length,
    uniqueGenres: genreMap.size,
    moviesByGenre: Array.from(genreMap.values())
      .sort((a, b) => b.count - a.count)
      .map((genre) => ({
        genre: { id: genre.id, name: genre.name },
        count: genre.count,
      })),
    uniqueActors: actorMap.size,
    topActors,
    uniqueCrew: crewMap.size,
    topCrew,
    yearRange,
    averageRuntime,
    averageVoteAverage,
  };
}

