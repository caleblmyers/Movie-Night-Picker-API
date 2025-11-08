import { Context } from "../context";
import { Person } from "../types";
import { transformTMDBPerson } from "../utils/transformers";
import { handleError } from "../utils/errorHandler";

export const personResolvers = {
  Query: {
    getPerson: async (
      _parent: unknown,
      args: { id: number },
      context: Context
    ): Promise<Person> => {
      try {
        const tmdbPerson = await context.tmdb.getPerson(args.id);
        return transformTMDBPerson(tmdbPerson);
      } catch (error) {
        throw handleError(error, "Failed to fetch person");
      }
    },

    searchPeople: async (
      _parent: unknown,
      args: { query: string },
      context: Context
    ): Promise<Person[]> => {
      try {
        const tmdbPeople = await context.tmdb.searchPeople(args.query);
        return tmdbPeople.map(transformTMDBPerson);
      } catch (error) {
        throw handleError(error, "Failed to search people");
      }
    },

    randomPerson: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ): Promise<Person> => {
      try {
        const tmdbPerson = await context.tmdb.getRandomPerson();
        return transformTMDBPerson(tmdbPerson);
      } catch (error) {
        throw handleError(error, "Failed to get random person");
      }
    },
  },
};

