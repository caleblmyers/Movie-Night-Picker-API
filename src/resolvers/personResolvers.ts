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
        // Validate and set limit (default: 20, max: 100)
        // For autocomplete, typically 10-20 results is ideal
        const limit = args.limit
          ? Math.min(Math.max(1, args.limit), 100)
          : 20;

        const options = convertGraphQLOptionsToTMDBOptions(args.options);
        const tmdbPeople = await context.tmdb.searchPeople(
          args.query,
          limit,
          options
        );
        const roleType = args.roleType?.toLowerCase() || "both";

        // Filter by role type if specified
        let filteredPeople = tmdbPeople;
        if (roleType !== "both") {
          // Get IDs of people that match the role type
          const personIds = (tmdbPeople as Array<{ id: number }>).map((p) => p.id);
          const filteredIds = await context.tmdb.filterPeopleByRole(
            personIds.map((id) => ({ id })),
            roleType as "actor" | "crew"
          );
          const filteredIdSet = new Set(filteredIds.map((p) => p.id));
          // Keep only the full person objects that match the role
          filteredPeople = (tmdbPeople as Array<{ id: number }>).filter((p) =>
            filteredIdSet.has(p.id)
          );
        }

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

