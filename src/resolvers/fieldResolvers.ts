import { Context } from "../context";
import { fetchMovieFromTMDB } from "../utils/movieHelpers";

export const fieldResolvers = {
  User: {
    createdAt: (user: { createdAt: Date }) => user.createdAt.toISOString(),
    savedMovies: async (user: { id: number }, _args: unknown, context: Context) => {
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
  },

  Rating: {
    createdAt: (rating: { createdAt: Date }) => rating.createdAt.toISOString(),
    updatedAt: (rating: { updatedAt: Date }) => rating.updatedAt.toISOString(),
    movie: async (rating: { tmdbId: number }, _args: unknown, context: Context) => {
      return fetchMovieFromTMDB(rating.tmdbId, context);
    },
  },

  Review: {
    createdAt: (review: { createdAt: Date }) => review.createdAt.toISOString(),
    updatedAt: (review: { updatedAt: Date }) => review.updatedAt.toISOString(),
    movie: async (review: { tmdbId: number }, _args: unknown, context: Context) => {
      return fetchMovieFromTMDB(review.tmdbId, context);
    },
  },
};

