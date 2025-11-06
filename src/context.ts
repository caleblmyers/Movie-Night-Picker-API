import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { TMDBDataSource } from "./datasources/tmdb";

const prisma = new PrismaClient();

export interface Context {
  prisma: PrismaClient;
  tmdb: TMDBDataSource;
  req: Request;
  res: Response;
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

  return {
    prisma,
    tmdb,
    req,
    res,
  };
};
