import { Context } from "../context";
import { fetchMovieFromTMDB } from "../utils/movieHelpers";
import {
  getUserWithoutPassword,
  findUserRating,
  findUserReview,
  isMovieSaved,
  calculateAverageRating,
} from "../utils/dbHelpers";
import { extractTrailer, transformTMDBMovie } from "../utils/transformers";
import { GENRE_ICONS } from "../constants";
import { calculateCollectionInsights } from "../utils/collectionInsights";

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
    insights: async (
      collection: { id: number },
      _args: unknown,
      context: Context
    ) => {
      return calculateCollectionInsights(collection.id, context);
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
    genres: async (
      movie: { id: number; genres?: Array<{ id: number; name: string }> },
      _args: unknown,
      context: Context
    ) => {
      // If genres are already present, return them
      if (movie.genres && movie.genres.length > 0) {
        return movie.genres.map((genre) => ({
          id: genre.id,
          name: genre.name,
          icon: GENRE_ICONS[genre.id] || null,
        }));
      }

      // Otherwise, fetch full movie details to get genres
      try {
        const fullMovie = await context.tmdb.getMovie(movie.id, undefined, false);
        const genres = (fullMovie as { genres?: Array<{ id: number; name: string }> }).genres || [];
        return genres.map((genre) => ({
          id: genre.id,
          name: genre.name,
          icon: GENRE_ICONS[genre.id] || null,
        }));
      } catch (error) {
        return [];
      }
    },

    cast: async (
      movie: { id: number; cast?: Array<{ id: number; name: string; character?: string | null; profileUrl?: string | null; order?: number | null }> },
      _args: unknown,
      context: Context
    ) => {
      // If cast is already present, return it
      if (movie.cast && movie.cast.length > 0) {
        return movie.cast;
      }

      // Otherwise, fetch credits
      try {
        const credits = await context.tmdb.getMovieCredits(movie.id);
        const cast = (credits.cast || []).slice(0, 20).map((member: { id: number; name: string; character?: string | null; profile_path?: string | null; order?: number | null }) => ({
          id: member.id,
          name: member.name,
          character: member.character || null,
          profileUrl: member.profile_path
            ? `https://image.tmdb.org/t/p/w500${member.profile_path}`
            : null,
          order: member.order || null,
        }));
        return cast;
      } catch (error) {
        return [];
      }
    },

    crew: async (
      movie: { id: number; crew?: Array<{ id: number; name: string; job?: string | null; department?: string | null; profileUrl?: string | null }> },
      _args: unknown,
      context: Context
    ) => {
      // If crew is already present, return it
      if (movie.crew && movie.crew.length > 0) {
        return movie.crew;
      }

      // Otherwise, fetch credits
      try {
        const credits = await context.tmdb.getMovieCredits(movie.id);
        const crew = (credits.crew || [])
          .filter(
            (member: { job?: string; department?: string }) =>
              member.job === "Director" ||
              member.department === "Directing" ||
              member.job === "Writer" ||
              member.department === "Writing" ||
              member.job === "Screenplay" ||
              member.job === "Story" ||
              member.job === "Producer" ||
              member.department === "Production"
          )
          .slice(0, 15)
          .map((member: { id: number; name: string; job?: string | null; department?: string | null; profile_path?: string | null }) => ({
            id: member.id,
            name: member.name,
            job: member.job || null,
            department: member.department || null,
            profileUrl: member.profile_path
              ? `https://image.tmdb.org/t/p/w500${member.profile_path}`
              : null,
          }));
        return crew;
      } catch (error) {
        return [];
      }
    },

    trailer: async (
      movie: { id: number; trailer?: { key: string; site: string; name: string; type: string; url: string } | null },
      _args: unknown,
      context: Context
    ) => {
      // If trailer is already present, return it
      if (movie.trailer) {
        return movie.trailer;
      }

      // Otherwise, fetch videos for this movie
      try {
        const videos = await context.tmdb.getMovieVideos(movie.id);
        return extractTrailer(videos.results || []);
      } catch (error) {
        return null;
      }
    },

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

  Person: {
    movies: async (
      person: { id: number },
      _args: unknown,
      context: Context
    ) => {
      try {
        // Fetch combined credits (cast and crew)
        const credits = await context.tmdb.getPersonCombinedCredits(person.id);
        
        // Combine cast and crew arrays
        const allCredits: Array<{ id: number; [key: string]: unknown }> = [];
        
        // Add cast credits (movies they acted in)
        if (credits.cast && Array.isArray(credits.cast)) {
          credits.cast.forEach((credit: unknown) => {
            const movie = credit as { id?: number; media_type?: string };
            // Only include movies (not TV shows)
            if (movie.id && (!movie.media_type || movie.media_type === "movie")) {
              allCredits.push(movie as { id: number; [key: string]: unknown });
            }
          });
        }
        
        // Add crew credits (movies they worked on as crew)
        if (credits.crew && Array.isArray(credits.crew)) {
          credits.crew.forEach((credit: unknown) => {
            const movie = credit as { id?: number; media_type?: string };
            // Only include movies (not TV shows)
            if (movie.id && (!movie.media_type || movie.media_type === "movie")) {
              allCredits.push(movie as { id: number; [key: string]: unknown });
            }
          });
        }
        
        // Remove duplicates by movie ID
        const uniqueMovies = new Map<number, { id: number; [key: string]: unknown }>();
        allCredits.forEach((movie) => {
          if (!uniqueMovies.has(movie.id)) {
            uniqueMovies.set(movie.id, movie);
          }
        });
        
        // Transform to Movie type
        const movies = Array.from(uniqueMovies.values()).map((movie) =>
          transformTMDBMovie(movie)
        );
        
        // Sort by release date (most recent first)
        movies.sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
        
        return movies;
      } catch (error) {
        // Return empty array on error rather than throwing
        // This allows person queries to succeed even if credits fail
        console.error(`Failed to fetch movies for person ${person.id}:`, error);
        return [];
      }
    },
  },
};
