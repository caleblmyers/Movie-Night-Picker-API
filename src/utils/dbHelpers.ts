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
 * Check if user has saved a movie
 */
export async function isMovieSaved(
  prisma: PrismaClient,
  userId: number,
  tmdbId: number
): Promise<boolean> {
  const savedMovie = await prisma.savedMovie.findUnique({
    where: {
      userId_tmdbId: {
        userId,
        tmdbId,
      },
    },
  });
  return !!savedMovie;
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

