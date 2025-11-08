import { PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
import { TMDBDataSource } from "./datasources/tmdb";
import { extractTokenFromHeader, verifyToken } from "./utils/auth";

const prisma = new PrismaClient();

export interface Context {
  prisma: PrismaClient;
  tmdb: TMDBDataSource;
  req: Request;
  res: Response;
  user: User | null;
}

export const createContext = async ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> => {
  console.log("[CONTEXT] Creating GraphQL context");
  
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    console.error("[CONTEXT] Error: TMDB_API_KEY environment variable is missing");
    throw new Error("TMDB_API_KEY environment variable is required");
  }

  const tmdb = new TMDBDataSource(tmdbApiKey);
  console.log("[CONTEXT] TMDB data source initialized");

  // Extract and verify user from JWT token
  let user: User | null = null;
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    console.log("[CONTEXT] Token found in request, attempting to verify...");
    try {
      const payload = verifyToken(token);
      console.log("[CONTEXT] Token verified, fetching user with ID:", payload.userId);
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (user) {
        console.log("[CONTEXT] User authenticated:", user.email);
      } else {
        console.log("[CONTEXT] User not found for token payload");
      }
    } catch (error) {
      console.log("[CONTEXT] Token verification failed (this is OK for unauthenticated requests):", error);
      // Invalid token, user remains null
      // Don't throw error here - allow unauthenticated requests
    }
  } else {
    console.log("[CONTEXT] No token found, proceeding as unauthenticated request");
  }

  console.log("[CONTEXT] Context created successfully");
  return {
    prisma,
    tmdb,
    req,
    res,
    user,
  };
};
