import { Context } from "../context";
import { fetchMovieFromTMDB } from "../utils/movieHelpers";
import {
  getUserWithoutPassword,
  findUserRating,
  findUserReview,
  isMovieSaved,
  calculateAverageRating,
} from "../utils/dbHelpers";

export const fieldResolvers = {
  User: {
    createdAt: (user: { createdAt: Date }) => user.createdAt.toISOString(),
    savedMovies: async (
      user: { id: number },
      _args: unknown,
      context: Context
    ) => {
      return context.prisma.savedMovie.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
    },
    ratings: async (user: { id: number }, _args: unknown, context: Context) => {
      return context.prisma.rating.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      });
    },
    reviews: async (user: { id: number }, _args: unknown, context: Context) => {
      return context.prisma.review.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      });
    },
    collections: async (
      user: { id: number },
      _args: unknown,
      context: Context
    ) => {
      return context.prisma.collection.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      });
    },
  },

  SavedMovie: {
    createdAt: (savedMovie: { createdAt: Date }) =>
      savedMovie.createdAt.toISOString(),
    movie: async (
      savedMovie: { tmdbId: number },
      _args: unknown,
      context: Context
    ) => {
      return fetchMovieFromTMDB(savedMovie.tmdbId, context);
    },
    rating: async (
      savedMovie: { tmdbId: number },
      _args: unknown,
      context: Context
    ) => {
      if (!context.user) {
        return null;
      }

      try {
        return findUserRating(
          context.prisma,
          context.user.id,
          savedMovie.tmdbId
        );
      } catch (error) {
        return null;
      }
    },
    review: async (
      savedMovie: { tmdbId: number },
      _args: unknown,
      context: Context
    ) => {
      if (!context.user) {
        return null;
      }

      try {
        return findUserReview(
          context.prisma,
          context.user.id,
          savedMovie.tmdbId
        );
      } catch (error) {
        return null;
      }
    },
  },

  Rating: {
    createdAt: (rating: { createdAt: Date }) => rating.createdAt.toISOString(),
    updatedAt: (rating: { updatedAt: Date }) => rating.updatedAt.toISOString(),
    value: (rating: { rating: number }) => rating.rating, // Maps database 'rating' field to GraphQL 'value' field
    movie: async (
      rating: { tmdbId: number },
      _args: unknown,
      context: Context
    ) => {
      return fetchMovieFromTMDB(rating.tmdbId, context);
    },
    user: async (
      rating: { userId: number },
      _args: unknown,
      context: Context
    ) => {
      return getUserWithoutPassword(context.prisma, rating.userId);
    },
  },

  Review: {
    createdAt: (review: { createdAt: Date }) => review.createdAt.toISOString(),
    updatedAt: (review: { updatedAt: Date }) => review.updatedAt.toISOString(),
    movie: async (
      review: { tmdbId: number },
      _args: unknown,
      context: Context
    ) => {
      return fetchMovieFromTMDB(review.tmdbId, context);
    },
    user: async (
      review: { userId: number },
      _args: unknown,
      context: Context
    ) => {
      return getUserWithoutPassword(context.prisma, review.userId);
    },
  },

  Collection: {
    createdAt: (collection: { createdAt: Date }) =>
      collection.createdAt.toISOString(),
    updatedAt: (collection: { updatedAt: Date }) =>
      collection.updatedAt.toISOString(),
    user: async (
      collection: { userId: number },
      _args: unknown,
      context: Context
    ) => {
      return getUserWithoutPassword(context.prisma, collection.userId);
    },
    movies: async (
      collection: { id: number },
      _args: unknown,
      context: Context
    ) => {
      return context.prisma.collectionMovie.findMany({
        where: { collectionId: collection.id },
        orderBy: { addedAt: "desc" },
      });
    },
    movieCount: async (
      collection: { id: number },
      _args: unknown,
      context: Context
    ) => {
      return context.prisma.collectionMovie.count({
        where: { collectionId: collection.id },
      });
    },
  },

  CollectionMovie: {
    addedAt: (collectionMovie: { addedAt: Date }) =>
      collectionMovie.addedAt.toISOString(),
    movie: async (
      collectionMovie: { tmdbId: number },
      _args: unknown,
      context: Context
    ) => {
      return fetchMovieFromTMDB(collectionMovie.tmdbId, context);
    },
  },

  Movie: {
    rating: async (movie: { id: number }, _args: unknown, context: Context) => {
      if (!context.user) {
        return null;
      }

      try {
        return findUserRating(context.prisma, context.user.id, movie.id);
      } catch (error) {
        return null;
      }
    },

    review: async (movie: { id: number }, _args: unknown, context: Context) => {
      if (!context.user) {
        return null;
      }

      try {
        return findUserReview(context.prisma, context.user.id, movie.id);
      } catch (error) {
        return null;
      }
    },

    isSaved: async (
      movie: { id: number },
      _args: unknown,
      context: Context
    ) => {
      if (!context.user) {
        return false;
      }

      try {
        return isMovieSaved(context.prisma, context.user.id, movie.id);
      } catch (error) {
        return false;
      }
    },

    inCollections: async (
      movie: { id: number },
      _args: unknown,
      context: Context
    ) => {
      if (!context.user) {
        return [];
      }

      try {
        // Find all collections that contain this movie
        const collectionMovies = await context.prisma.collectionMovie.findMany({
          where: {
            tmdbId: movie.id,
            collection: {
              userId: context.user.id,
            },
          },
          include: {
            collection: true,
          },
        });

        return collectionMovies.map((cm) => cm.collection);
      } catch (error) {
        return [];
      }
    },

    reviews: async (
      movie: { id: number },
      _args: unknown,
      context: Context
    ) => {
      try {
        return context.prisma.review.findMany({
          where: { tmdbId: movie.id },
          orderBy: { updatedAt: "desc" },
        });
      } catch (error) {
        return [];
      }
    },

    ratings: async (
      movie: { id: number },
      _args: unknown,
      context: Context
    ) => {
      try {
        return context.prisma.rating.findMany({
          where: { tmdbId: movie.id },
          orderBy: { updatedAt: "desc" },
        });
      } catch (error) {
        return [];
      }
    },

    averageUserRating: async (
      movie: { id: number },
      _args: unknown,
      context: Context
    ) => {
      try {
        const ratings = await context.prisma.rating.findMany({
          where: { tmdbId: movie.id },
          select: { rating: true },
        });

        return calculateAverageRating(ratings);
      } catch (error) {
        return null;
      }
    },
  },
};
