import { Context } from "../context";
import { Person, TMDBOptions } from "../types";
import { transformTMDBPerson } from "../utils/transformers";
import { handleError } from "../utils/errorHandler";

function convertGraphQLOptionsToTMDBOptions(
  options?: any
): TMDBOptions | undefined {
  if (!options) return undefined;

  const tmdbOptions: TMDBOptions = {};
  if (options.region) tmdbOptions.region = options.region;
  if (options.language) tmdbOptions.language = options.language;
  if (options.sortBy) tmdbOptions.sortBy = options.sortBy;
  if (options.page) tmdbOptions.page = options.page;
  if (options.year) tmdbOptions.year = options.year;
  if (options.primaryReleaseYear)
    tmdbOptions.primaryReleaseYear = options.primaryReleaseYear;
  if (options.voteAverageGte !== undefined)
    tmdbOptions.voteAverageGte = options.voteAverageGte;
  if (options.voteCountGte !== undefined)
    tmdbOptions.voteCountGte = options.voteCountGte;
  if (options.withOriginalLanguage)
    tmdbOptions.withOriginalLanguage = options.withOriginalLanguage;
  if (options.withWatchProviders)
    tmdbOptions.withWatchProviders = options.withWatchProviders;
  if (options.includeAdult !== undefined)
    tmdbOptions.includeAdult = options.includeAdult;

  return Object.keys(tmdbOptions).length > 0 ? tmdbOptions : undefined;
}

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
      args: { query: string; roleType?: "ACTOR" | "CREW" | "BOTH" },
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
                tmdbPeople as Array<{ id: number }>,
                roleType as "actor" | "crew" | "both"
              );

        return filteredPeople.map(transformTMDBPerson);
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

    trendingPeople: async (
      _parent: unknown,
      args: {
        timeWindow?: "DAY" | "WEEK";
        roleType?: "ACTOR" | "CREW" | "BOTH";
        options?: any;
      },
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
                tmdbPeople as Array<{ id: number }>,
                roleType as "actor" | "crew" | "both"
              );

        return filteredPeople.map(transformTMDBPerson);
      } catch (error) {
        throw handleError(error, "Failed to get trending people");
      }
    },
  },
};

