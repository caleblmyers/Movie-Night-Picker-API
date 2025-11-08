import { Context } from "../context";
import { Person } from "../types";
import {
  GetPersonArgs,
  SearchPeopleArgs,
  RandomPersonArgs,
  TrendingPeopleArgs,
} from "../types/resolvers";
import {
  transformTMDBPerson,
  TMDBPersonResponse,
} from "../utils/transformers";
import { handleError } from "../utils/errorHandler";
import { convertGraphQLOptionsToTMDBOptions } from "../utils/tmdbOptionsConverter";

export const personResolvers = {
  Query: {
    getPerson: async (
      _parent: unknown,
      args: GetPersonArgs,
      context: Context
    ): Promise<Person> => {
      try {
        const tmdbPerson = await context.tmdb.getPerson(args.id);
        return transformTMDBPerson(tmdbPerson as TMDBPersonResponse);
      } catch (error) {
        throw handleError(error, "Failed to fetch person");
      }
    },

    searchPeople: async (
      _parent: unknown,
      args: SearchPeopleArgs,
      context: Context
    ): Promise<Person[]> => {
      try {
        const tmdbPeople = await context.tmdb.searchPeople(args.query);
        const roleType = args.roleType?.toLowerCase() || "both";

        // Filter by role type if specified
        const filteredPeople =
          roleType === "both"
            ? tmdbPeople
            : await context.tmdb.filterPeopleByRole(
                (tmdbPeople as Array<{ id: number }>).map((p) => ({ id: p.id })),
                roleType as "actor" | "crew"
              );

        return filteredPeople.map((p) =>
          transformTMDBPerson(p as TMDBPersonResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to search people");
      }
    },

    randomPerson: async (
      _parent: unknown,
      _args: RandomPersonArgs,
      context: Context
    ): Promise<Person> => {
      try {
        const tmdbPerson = await context.tmdb.getRandomPerson();
        return transformTMDBPerson(tmdbPerson as TMDBPersonResponse);
      } catch (error) {
        throw handleError(error, "Failed to get random person");
      }
    },

    trendingPeople: async (
      _parent: unknown,
      args: TrendingPeopleArgs,
      context: Context
    ): Promise<Person[]> => {
      try {
        const timeWindow = args.timeWindow
          ? args.timeWindow.toLowerCase()
          : "day";
        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbPeople = await context.tmdb.getTrendingPeople(
          timeWindow as "day" | "week",
          options
        );
        const roleType = args.roleType?.toLowerCase() || "both";

        // Filter by role type if specified
        const filteredPeople =
          roleType === "both"
            ? tmdbPeople
            : await context.tmdb.filterPeopleByRole(
                (tmdbPeople as Array<{ id: number }>).map((p) => ({ id: p.id })),
                roleType as "actor" | "crew"
              );

        return filteredPeople.map((p) =>
          transformTMDBPerson(p as TMDBPersonResponse)
        );
      } catch (error) {
        throw handleError(error, "Failed to get trending people");
      }
    },
  },
};

