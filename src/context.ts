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
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    throw new Error("TMDB_API_KEY environment variable is required");
  }

  const tmdb = new TMDBDataSource(tmdbApiKey);

  // Extract and verify user from JWT token
  let user: User | null = null;
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const payload = verifyToken(token);
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
    } catch (error) {
      // Invalid token, user remains null
      // Don't throw error here - allow unauthenticated requests
    }
  }

  return {
    prisma,
    tmdb,
    req,
    res,
    user,
  };
};
