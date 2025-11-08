import { Context } from "../context";
import { Movie } from "../types";
import { transformTMDBMovie } from "./transformers";

/**
 * Fetch movie from TMDB by ID, returning null if not found
 */
export async function fetchMovieFromTMDB(
  tmdbId: number,
  context: Context
): Promise<Movie | null> {
  try {
    const tmdbMovie = await context.tmdb.getMovie(tmdbId);
    return transformTMDBMovie(tmdbMovie);
  } catch (error) {
    // If movie not found in TMDB, return null
    return null;
  }
}

