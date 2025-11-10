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

interface KeywordCount {
  keyword: { id: number; name: string };
  count: number;
}

export interface CollectionInsightsData {
  totalMovies: number;
  uniqueGenres: number;
  moviesByGenre: GenreCount[];
  uniqueKeywords: number;
  topKeywords: KeywordCount[];
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

  // Empty insights object (reused for early returns)
  const emptyInsights: CollectionInsightsData = {
    totalMovies: 0,
    uniqueGenres: 0,
    moviesByGenre: [],
    uniqueKeywords: 0,
    topKeywords: [],
    uniqueActors: 0,
    topActors: [],
    uniqueCrew: 0,
    topCrew: [],
    yearRange: null,
    averageRuntime: null,
    averageVoteAverage: null,
  };

  if (collectionMovies.length === 0) {
    return emptyInsights;
  }

  // Fetch full movie details and keywords from TMDB (in batches to avoid overwhelming the API)
  const movieIds = collectionMovies.map((cm) => cm.tmdbId);
  const batchSize = 10;
  const movies: Movie[] = [];
  const keywordsByMovieId = new Map<number, Array<{ id: number; name: string }>>();

  // Fetch movies and keywords in parallel batches
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    
    // Fetch movies and keywords in parallel for each batch
    const batchPromises = batch.map(async (id) => {
      const [movieResult, keywordResult] = await Promise.all([
        context.tmdb
          .getMovie(id, undefined, true)
          .then((movie) => transformTMDBMovie(movie as TMDBMovieResponse))
          .catch(() => null),
        context.tmdb
          .getMovieKeywords(id)
          .then((data) => data.keywords || [])
          .catch(() => []),
      ]);
      
      if (movieResult) {
        keywordsByMovieId.set(id, keywordResult);
        return movieResult;
      }
      return null;
    });
    
    const batchMovies = await Promise.all(batchPromises);
    movies.push(...(batchMovies.filter((m) => m !== null) as Movie[]));
  }

  // If no movies were successfully fetched, return empty insights
  if (movies.length === 0) {
    return emptyInsights;
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
  const keywordCountMap = new Map<number, { id: number; name: string; count: number }>();
  const years: number[] = [];
  const runtimes: number[] = [];
  const voteAverages: number[] = [];

  // Helper function to increment map count
  const incrementMapCount = <T extends { id: number }>(
    map: Map<number, T & { count: number }>,
    item: T,
    createFn: (item: T) => T & { count: number }
  ) => {
    const existing = map.get(item.id);
    if (existing) {
      existing.count++;
    } else {
      map.set(item.id, createFn(item));
    }
  };

  movies.forEach((movie) => {
    // Genres
    if (movie.genres) {
      movie.genres.forEach((genre) => {
        incrementMapCount(genreMap, genre, (g) => ({
          ...g,
          count: 1,
        }));
      });
    }

    // Keywords - use movie ID to get keywords from map
    const keywords = keywordsByMovieId.get(movie.id);
    if (keywords) {
      keywords.forEach((keyword) => {
        incrementMapCount(keywordCountMap, keyword, (k) => ({
          ...k,
          count: 1,
        }));
      });
    }

    // Actors
    if (movie.cast) {
      movie.cast.forEach((actor) => {
        incrementMapCount(actorMap, actor, (a) => ({
          ...a,
          profileUrl: a.profileUrl ?? null,
          count: 1,
        }));
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
          incrementMapCount(crewMap, member, (m) => ({
            ...m,
            profileUrl: m.profileUrl ?? null,
            count: 1,
          }));
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

  // Sort and get top keywords
  const topKeywords = Array.from(keywordCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((keyword) => ({
      keyword: {
        id: keyword.id,
        name: keyword.name,
      },
      count: keyword.count,
    }));

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
    uniqueKeywords: keywordCountMap.size,
    topKeywords,
    uniqueActors: actorMap.size,
    topActors,
    uniqueCrew: crewMap.size,
    topCrew,
    yearRange,
    averageRuntime,
    averageVoteAverage,
  };
}

