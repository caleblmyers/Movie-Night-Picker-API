/**
 * Helper functions for collection operations
 */

import { PrismaClient } from "@prisma/client";
import { Context } from "../context";
import { calculateCollectionInsights, CollectionInsightsData } from "./collectionInsights";
import { ERROR_MESSAGES } from "../constants";

/**
 * Verify collection exists and user has access (owner or public)
 * Throws error if access denied
 */
export async function verifyCollectionAccess(
  prisma: PrismaClient,
  collectionId: number,
  userId: number
): Promise<{ id: number; userId: number; isPublic: boolean }> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { id: true, userId: true, isPublic: true },
  });

  if (!collection) {
    throw new Error(ERROR_MESSAGES.COLLECTION_NOT_FOUND);
  }

  if (collection.userId !== userId && !collection.isPublic) {
    throw new Error(ERROR_MESSAGES.COLLECTION_NO_ACCESS);
  }

  return collection;
}

/**
 * Get all movie IDs from specified collections
 */
export async function getMovieIdsFromCollections(
  prisma: PrismaClient,
  userId: number,
  collectionIds: number[]
): Promise<number[]> {
  if (!collectionIds || collectionIds.length === 0) {
    return [];
  }

  // Verify user owns all collections
  const collections = await prisma.collection.findMany({
    where: {
      id: { in: collectionIds },
      userId,
    },
    select: { id: true },
  });

  if (collections.length !== collectionIds.length) {
    throw new Error("One or more collections not found or access denied");
  }

  // Get all movie IDs from these collections
  const collectionMovies = await prisma.collectionMovie.findMany({
    where: {
      collectionId: { in: collectionIds },
    },
    select: { tmdbId: true },
    distinct: ["tmdbId"],
  });

  return collectionMovies.map((cm) => cm.tmdbId);
}

/**
 * Get all movie IDs that are in any collection for the user
 */
export async function getAllMovieIdsInCollections(
  prisma: PrismaClient,
  userId: number
): Promise<number[]> {
  const collectionMovies = await prisma.collectionMovie.findMany({
    where: {
      collection: {
        userId,
      },
    },
    select: { tmdbId: true },
    distinct: ["tmdbId"],
  });

  return collectionMovies.map((cm) => cm.tmdbId);
}


/**
 * Filter movies based on collection criteria
 */
export function filterMoviesByCollections(
  movies: Array<{ id: number }>,
  inCollectionIds: Set<number> | null,
  excludeCollectionIds: Set<number> | null,
  notInAnyCollection: boolean,
  allCollectionMovieIds: Set<number> | null
): Array<{ id: number }> {
  return movies.filter((movie) => {
    const movieId = movie.id;

    // If we need movies only from specific collections
    if (inCollectionIds && inCollectionIds.size > 0) {
      if (!inCollectionIds.has(movieId)) {
        return false;
      }
    }

    // If we need to exclude movies from specific collections
    if (excludeCollectionIds && excludeCollectionIds.size > 0) {
      if (excludeCollectionIds.has(movieId)) {
        return false;
      }
    }

    // If we need movies not in any collection
    if (notInAnyCollection) {
      if (allCollectionMovieIds && allCollectionMovieIds.has(movieId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract analysis data from collection insights for filtering
 * This is a pure function that transforms insights data
 */
export function extractCollectionAnalysis(
  insights: CollectionInsightsData,
  limit: number = 10
): {
  genres?: number[];
  keywords?: number[];
  actors?: number[];
  crew?: number[];
  yearRange?: number[];
} {
  return {
    genres: insights.moviesByGenre
      .slice(0, limit)
      .map((gc) => gc.genre.id),
    keywords: insights.topKeywords
      .slice(0, limit)
      .map((kc) => kc.keyword.id),
    actors: insights.topActors
      .slice(0, limit)
      .map((ac) => ac.person.id),
    crew: insights.topCrew
      .slice(0, limit)
      .map((cc) => cc.person.id),
    yearRange: insights.yearRange ? [insights.yearRange.min, insights.yearRange.max] : undefined,
  };
}

/**
 * Get collection analysis (top genres, keywords, actors) for filtering
 * Returns top items that can be merged with existing filters
 * Optionally accepts pre-calculated insights to avoid duplicate computation
 */
export async function getCollectionAnalysisForFiltering(
  collectionId: number,
  context: Context,
  limit: number = 10,
  preCalculatedInsights?: CollectionInsightsData
): Promise<{
  genres?: number[];
  keywords?: number[];
  actors?: number[];
  crew?: number[];
  yearRange?: number[];
}> {
  try {
    const insights = preCalculatedInsights || await calculateCollectionInsights(collectionId, context);
    return extractCollectionAnalysis(insights, limit);
  } catch (error) {
    // If collection analysis fails, return empty (don't break the query)
    return {};
  }
}

