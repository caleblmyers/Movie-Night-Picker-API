import { Context } from "../context";
import { requireAuth } from "../utils/authHelpers";
import { handleError } from "../utils/errorHandler";
import { verifyCollectionOwnership } from "../utils/dbHelpers";
import { validateCollectionName } from "../utils/validationHelpers";
import { calculateCollectionInsights } from "../utils/collectionInsights";
import {
  GetCollectionArgs,
  CreateCollectionArgs,
  UpdateCollectionArgs,
  DeleteCollectionArgs,
  AddMovieToCollectionArgs,
  RemoveMovieFromCollectionArgs,
  CollectionInsightsArgs,
  CollectionAnalysisArgs,
} from "../types/resolvers";
import { ERROR_MESSAGES } from "../constants";

export const collectionResolvers = {
  Query: {
    collections: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        return context.prisma.collection.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
        });
      } catch (error) {
        throw handleError(error, "Failed to fetch collections");
      }
    },

    getCollection: async (
      _parent: unknown,
      args: GetCollectionArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        const collection = await context.prisma.collection.findUnique({
          where: { id: args.id },
        });

        if (!collection) {
          throw new Error(ERROR_MESSAGES.COLLECTION_NOT_FOUND);
        }

        // Check if user has access (owner or public)
        if (collection.userId !== user.id && !collection.isPublic) {
          throw new Error(ERROR_MESSAGES.COLLECTION_NO_ACCESS);
        }

        return collection;
      } catch (error) {
        throw handleError(error, "Failed to fetch collection");
      }
    },

    collectionInsights: async (
      _parent: unknown,
      args: CollectionInsightsArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Verify collection exists and user has access
        const collection = await context.prisma.collection.findUnique({
          where: { id: args.collectionId },
        });

        if (!collection) {
          throw new Error(ERROR_MESSAGES.COLLECTION_NOT_FOUND);
        }

        if (collection.userId !== user.id && !collection.isPublic) {
          throw new Error(ERROR_MESSAGES.COLLECTION_NO_ACCESS);
        }

        return calculateCollectionInsights(args.collectionId, context);
      } catch (error) {
        throw handleError(error, "Failed to fetch collection insights");
      }
    },

    collectionAnalysis: async (
      _parent: unknown,
      args: CollectionAnalysisArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Verify collection exists and user has access
        const collection = await context.prisma.collection.findUnique({
          where: { id: args.collectionId },
        });

        if (!collection) {
          throw new Error(ERROR_MESSAGES.COLLECTION_NOT_FOUND);
        }

        if (collection.userId !== user.id && !collection.isPublic) {
          throw new Error(ERROR_MESSAGES.COLLECTION_NO_ACCESS);
        }

        // Get insights
        const insights = await calculateCollectionInsights(args.collectionId, context);
        const limit = args.limit || 10;

        // Extract top items
        return {
          topGenres: insights.moviesByGenre
            .slice(0, limit)
            .map((gc) => gc.genre),
          topKeywords: insights.topKeywords
            .slice(0, limit)
            .map((kc) => kc.keyword),
          topActors: insights.topActors
            .slice(0, limit)
            .map((ac) => ac.person),
          topCrew: insights.topCrew
            .slice(0, limit)
            .map((cc) => cc.person),
          yearRange: insights.yearRange,
        };
      } catch (error) {
        throw handleError(error, "Failed to fetch collection analysis");
      }
    },
  },

  Mutation: {
    createCollection: async (
      _parent: unknown,
      args: CreateCollectionArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      // Validate name
      const trimmedName = validateCollectionName(args.name);

      try {
        return context.prisma.collection.create({
          data: {
            name: trimmedName,
            description: args.description?.trim() || null,
            isPublic: args.isPublic ?? false,
            userId: user.id,
          },
        });
      } catch (error) {
        throw handleError(error, "Failed to create collection");
      }
    },

    updateCollection: async (
      _parent: unknown,
      args: UpdateCollectionArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Check if collection exists and user is owner
        verifyCollectionOwnership(context.prisma, args.id, user.id);

        // Build update data
        const updateData: {
          name?: string;
          description?: string | null;
          isPublic?: boolean;
        } = {};

        if (args.name !== undefined) {
          updateData.name = validateCollectionName(args.name);
        }

        if (args.description !== undefined) {
          updateData.description = args.description?.trim() || null;
        }

        if (args.isPublic !== undefined && args.isPublic !== null) {
          updateData.isPublic = args.isPublic;
        }

        return context.prisma.collection.update({
          where: { id: args.id },
          data: updateData,
        });
      } catch (error) {
        throw handleError(error, "Failed to update collection");
      }
    },

    deleteCollection: async (
      _parent: unknown,
      args: DeleteCollectionArgs,
      context: Context
    ): Promise<boolean> => {
      const user = requireAuth(context);

      try {
        // Check if collection exists and user is owner
        verifyCollectionOwnership(context.prisma, args.id, user.id);

        await context.prisma.collection.delete({
          where: { id: args.id },
        });

        return true;
      } catch (error) {
        throw handleError(error, "Failed to delete collection");
      }
    },

    addMovieToCollection: async (
      _parent: unknown,
      args: AddMovieToCollectionArgs,
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Check if collection exists and user is owner
        verifyCollectionOwnership(context.prisma, args.collectionId, user.id);

        // Check if movie is already in collection
        const existing = await context.prisma.collectionMovie.findUnique({
          where: {
            collectionId_tmdbId: {
              collectionId: args.collectionId,
              tmdbId: args.tmdbId,
            },
          },
        });

        if (existing) {
          return existing;
        }

        // Add movie to collection
        return context.prisma.collectionMovie.create({
          data: {
            collectionId: args.collectionId,
            tmdbId: args.tmdbId,
          },
        });
      } catch (error) {
        throw handleError(error, "Failed to add movie to collection");
      }
    },

    removeMovieFromCollection: async (
      _parent: unknown,
      args: RemoveMovieFromCollectionArgs,
      context: Context
    ): Promise<boolean> => {
      const user = requireAuth(context);

      try {
        // Check if collection exists and user is owner
        verifyCollectionOwnership(context.prisma, args.collectionId, user.id);

        await context.prisma.collectionMovie.deleteMany({
          where: {
            collectionId: args.collectionId,
            tmdbId: args.tmdbId,
          },
        });

        return true;
      } catch (error) {
        throw handleError(error, "Failed to remove movie from collection");
      }
    },
  },
};

