import { TMDBOptions, GraphQLOptionsInput } from "../types";

/**
 * Convert GraphQL options input to TMDB options format
 * Handles optional fields and provides proper type conversion
 */
export function convertGraphQLOptionsToTMDBOptions(
  options?: GraphQLOptionsInput | null
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

