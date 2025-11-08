import { Context } from "../context";
import { requireAuth } from "../utils/authHelpers";
import { handleError } from "../utils/errorHandler";
import { excludePassword } from "../utils/userHelpers";
import { validateUserName } from "../utils/validationHelpers";
import {
  SaveMovieArgs,
  RateMovieArgs,
  ReviewMovieArgs,
  UpdateNameArgs,
} from "../types/resolvers";
import { ERROR_MESSAGES, MIN_RATING, MAX_RATING } from "../constants";

/**
 * Helper function to fetch user's saved movies
 */
async function getUserSavedMovies(userId: number, prisma: Context["prisma"]) {
  return prisma.savedMovie.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Helper function to fetch user's ratings
 */
async function getUserRatings(userId: number, prisma: Context["prisma"]) {
  return prisma.rating.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Helper function to fetch user's reviews
 */
async function getUserReviews(userId: number, prisma: Context["prisma"]) {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export const userResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = requireAuth(context);
      return excludePassword(user);
    },

    savedMovies: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      const user = requireAuth(context);
      return getUserSavedMovies(user.id, context.prisma);
    },

    ratings: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      const user = requireAuth(context);
      return getUserRatings(user.id, context.prisma);
    },

    reviews: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      const user = requireAuth(context);
      return getUserReviews(user.id, context.prisma);
    },
  },

  Mutation: {
    saveMovie: async (
      _parent: unknown,
      args: SaveMovieArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Check if movie is already saved
        const existing = await context.prisma.savedMovie.findUnique({
          where: {
            userId_tmdbId: {
              userId: user.id,
              tmdbId: args.tmdbId,
            },
          },
        });

        if (existing) {
          return existing;
        }

        // Save the movie
        return context.prisma.savedMovie.create({
          data: {
            userId: user.id,
            tmdbId: args.tmdbId,
          },
        });
      } catch (error) {
        throw handleError(error, "Failed to save movie");
      }
    },

    unsaveMovie: async (
      _parent: unknown,
      args: SaveMovieArgs,
      context: Context
    ): Promise<boolean> => {
      const user = requireAuth(context);

      try {
        await context.prisma.savedMovie.deleteMany({
          where: {
            userId: user.id,
            tmdbId: args.tmdbId,
          },
        });

        return true;
      } catch (error) {
        throw handleError(error, "Failed to unsave movie");
      }
    },

    rateMovie: async (
      _parent: unknown,
      args: RateMovieArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      // Validate rating
      if (args.rating < MIN_RATING || args.rating > MAX_RATING) {
        throw new Error(ERROR_MESSAGES.RATING_INVALID);
      }

      try {
        // Upsert rating (create or update)
        return context.prisma.rating.upsert({
          where: {
            userId_tmdbId: {
              userId: user.id,
              tmdbId: args.tmdbId,
            },
          },
          update: {
            rating: args.rating,
          },
          create: {
            userId: user.id,
            tmdbId: args.tmdbId,
            rating: args.rating,
          },
        });
      } catch (error) {
        throw handleError(error, "Failed to rate movie");
      }
    },

    reviewMovie: async (
      _parent: unknown,
      args: ReviewMovieArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      if (!args.content.trim()) {
        throw new Error(ERROR_MESSAGES.REVIEW_EMPTY);
      }

      try {
        // Upsert review (create or update)
        return context.prisma.review.upsert({
          where: {
            userId_tmdbId: {
              userId: user.id,
              tmdbId: args.tmdbId,
            },
          },
          update: {
            content: args.content,
          },
          create: {
            userId: user.id,
            tmdbId: args.tmdbId,
            content: args.content,
          },
        });
      } catch (error) {
        throw handleError(error, "Failed to review movie");
      }
    },

    deleteReview: async (
      _parent: unknown,
      args: SaveMovieArgs,
      context: Context
    ): Promise<boolean> => {
      const user = requireAuth(context);

      try {
        await context.prisma.review.deleteMany({
          where: {
            userId: user.id,
            tmdbId: args.tmdbId,
          },
        });

        return true;
      } catch (error) {
        throw handleError(error, "Failed to delete review");
      }
    },

    updateName: async (
      _parent: unknown,
      args: UpdateNameArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      // Validate name
      const trimmedName = validateUserName(args.name);

      try {
        const updatedUser = await context.prisma.user.update({
          where: { id: user.id },
          data: { name: trimmedName },
        });

        return excludePassword(updatedUser);
      } catch (error) {
        throw handleError(error, "Failed to update name");
      }
    },
  },
};

