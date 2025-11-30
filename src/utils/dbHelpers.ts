import { PrismaClient } from "@prisma/client";
import { UserWithoutPassword } from "../types/resolvers";
import { ERROR_MESSAGES } from "../constants";

/**
 * Fetch user by ID and exclude password
 */
export async function getUserWithoutPassword(
  prisma: PrismaClient,
  userId: number
): Promise<UserWithoutPassword> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Find user's rating for a movie
 */
export async function findUserRating(
  prisma: PrismaClient,
  userId: number,
  tmdbId: number
) {
  return prisma.rating.findUnique({
    where: {
      userId_tmdbId: {
        userId,
        tmdbId,
      },
    },
  });
}

/**
 * Find user's review for a movie
 */
export async function findUserReview(
  prisma: PrismaClient,
  userId: number,
  tmdbId: number
) {
  return prisma.review.findUnique({
    where: {
      userId_tmdbId: {
        userId,
        tmdbId,
      },
    },
  });
}

/**
 * Get or create the "Saved Movies" collection for a user
 */
export async function getOrCreateSavedMoviesCollection(
  prisma: PrismaClient,
  userId: number
) {
  // Try to find existing "Saved Movies" collection
  let collection = await prisma.collection.findFirst({
    where: {
      userId,
      name: "Saved Movies",
    },
  });

  // If it doesn't exist, create it
  if (!collection) {
    collection = await prisma.collection.create({
      data: {
        name: "Saved Movies",
        description: "Movies you've saved",
        isPublic: false,
        userId,
      },
    });
  }

  return collection;
}

/**
 * Check if user has saved a movie (checks the "Saved Movies" collection)
 */
export async function isMovieSaved(
  prisma: PrismaClient,
  userId: number,
  tmdbId: number
): Promise<boolean> {
  const collection = await getOrCreateSavedMoviesCollection(prisma, userId);
  
  const collectionMovie = await prisma.collectionMovie.findUnique({
    where: {
      collectionId_tmdbId: {
        collectionId: collection.id,
        tmdbId,
      },
    },
  });
  return !!collectionMovie;
}

/**
 * Verify collection ownership
 */
export async function verifyCollectionOwnership(
  prisma: PrismaClient,
  collectionId: number,
  userId: number
) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error(ERROR_MESSAGES.COLLECTION_NOT_FOUND);
  }

  if (collection.userId !== userId) {
    throw new Error(ERROR_MESSAGES.COLLECTION_NO_PERMISSION);
  }

  return collection;
}

/**
 * Calculate average rating from an array of ratings
 */
export function calculateAverageRating(ratings: { rating: number }[]): number | null {
  if (ratings.length === 0) {
    return null;
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return sum / ratings.length;
}

/**
 * Get suggest movie history for a user (up to 10 most recent)
 * Returns array of TMDB movie IDs
 */
export async function getSuggestHistory(
  prisma: PrismaClient,
  userId: number
): Promise<number[]> {
  const history = await prisma.suggestMovieHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { tmdbId: true },
  });

  return history.map((h) => h.tmdbId);
}

/**
 * Add a movie to suggest history
 * Maintains maximum of 10 movies by removing oldest if needed
 */
export async function addToSuggestHistory(
  prisma: PrismaClient,
  userId: number,
  tmdbId: number
): Promise<void> {
  // Check if movie already exists in history
  const existing = await prisma.suggestMovieHistory.findUnique({
    where: {
      userId_tmdbId: {
        userId,
        tmdbId,
      },
    },
  });

  if (existing) {
    // Update the createdAt timestamp to make it most recent
    await prisma.suggestMovieHistory.update({
      where: { id: existing.id },
      data: { createdAt: new Date() },
    });
  } else {
    // Add new entry
    await prisma.suggestMovieHistory.create({
      data: {
        userId,
        tmdbId,
      },
    });

    // Check if we have more than 10 entries
    const count = await prisma.suggestMovieHistory.count({
      where: { userId },
    });

    if (count > 10) {
      // Remove oldest entries (keep only 10 most recent)
      const oldestEntries = await prisma.suggestMovieHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        take: count - 10,
        select: { id: true },
      });

      await prisma.suggestMovieHistory.deleteMany({
        where: {
          id: { in: oldestEntries.map((e) => e.id) },
        },
      });
    }
  }
}

