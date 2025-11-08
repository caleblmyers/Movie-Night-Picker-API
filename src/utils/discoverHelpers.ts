import { DiscoverParams } from "../types";
import { MOOD_TO_KEYWORDS, getEraYearRange } from "../constants";

export interface DiscoverFilters {
  genres?: number[];
  yearRange?: number[];
  cast?: number[];
  actors?: number[];
  crew?: number[];
  mood?: string;
  era?: string;
  keywords?: number[];
}

export function buildDiscoverParams(
  filters: DiscoverFilters,
  useSingle: boolean = false
): DiscoverParams {
  const params: DiscoverParams = {};

  if (filters.genres && filters.genres.length > 0) {
    params.genres = useSingle ? [filters.genres[0]] : filters.genres;
  }

  // Handle yearRange - either explicit or from era
  if (filters.yearRange && filters.yearRange.length === 2) {
    params.yearRange = filters.yearRange;
  } else if (filters.era) {
    // Convert era to year range
    const eraYearRange = getEraYearRange(filters.era);
    if (eraYearRange) {
      params.yearRange = eraYearRange;
    }
  }

  // Support both 'cast' and 'actors' for flexibility
  const actors = filters.actors || filters.cast;
  if (actors && actors.length > 0) {
    params.actors = useSingle ? [actors[0]] : actors;
  }

  if (filters.crew && filters.crew.length > 0) {
    params.crew = useSingle ? [filters.crew[0]] : filters.crew;
  }

  // Map mood to keywords if provided
  if (filters.mood) {
    const moodKeywords = MOOD_TO_KEYWORDS[filters.mood];
    if (moodKeywords && moodKeywords.length > 0) {
      // Merge with existing keywords if any
      const existingKeywords = params.keywords || [];
      params.keywords = useSingle
        ? [...existingKeywords, moodKeywords[0]]
        : [...existingKeywords, ...moodKeywords];
    }
  }

  // Add explicit keywords if provided
  if (filters.keywords && filters.keywords.length > 0) {
    const existingKeywords = params.keywords || [];
    params.keywords = useSingle
      ? [...existingKeywords, filters.keywords[0]]
      : [...existingKeywords, ...filters.keywords];
  }

  return params;
}

export function shouldTryFallback(filters: DiscoverFilters): boolean {
  const hasMultipleGenres = !!(filters.genres && filters.genres.length > 1);
  const actors = filters.actors || filters.cast;
  const hasMultipleActors = !!(actors && actors.length > 1);
  const hasMultipleCrew = !!(filters.crew && filters.crew.length > 1);
  return hasMultipleGenres || hasMultipleActors || hasMultipleCrew;
}

/**
 * Build progressive fallback parameters by removing filters one at a time
 * Returns an array of parameter sets to try, from most specific to least specific
 */
export function buildProgressiveFallbackParams(
  filters: DiscoverFilters
): DiscoverParams[] {
  const fallbackParams: DiscoverParams[] = [];

  // Start with all parameters
  fallbackParams.push(buildDiscoverParams(filters, false));

  // If we have multiple filters, try removing them progressively
  const hasGenres = !!(filters.genres && filters.genres.length > 0);
  const hasActors = !!((filters.actors || filters.cast) && (filters.actors || filters.cast)!.length > 0);
  const hasCrew = !!(filters.crew && filters.crew.length > 0);
  const hasMood = !!filters.mood;
  const hasEra = !!filters.era;
  const hasYearRange = !!(filters.yearRange && filters.yearRange.length === 2);

  // Try removing one filter at a time
  if (hasMood) {
    fallbackParams.push(buildDiscoverParams({ ...filters, mood: undefined }, false));
  }
  if (hasCrew && hasActors) {
    fallbackParams.push(buildDiscoverParams({ ...filters, crew: undefined }, false));
  }
  if (hasActors) {
    fallbackParams.push(buildDiscoverParams({ ...filters, actors: undefined, cast: undefined }, false));
  }
  if (hasGenres && filters.genres!.length > 1) {
    fallbackParams.push(buildDiscoverParams({ ...filters, genres: [filters.genres![0]] }, false));
  }
  if (hasEra) {
    fallbackParams.push(buildDiscoverParams({ ...filters, era: undefined }, false));
  }
  if (hasYearRange) {
    fallbackParams.push(buildDiscoverParams({ ...filters, yearRange: undefined }, false));
  }

  // Try with only genres
  if (hasGenres) {
    fallbackParams.push(buildDiscoverParams({ genres: filters.genres }, false));
  }

  // Try with only year range or era
  if (hasYearRange) {
    fallbackParams.push(buildDiscoverParams({ yearRange: filters.yearRange }, false));
  } else if (hasEra) {
    fallbackParams.push(buildDiscoverParams({ era: filters.era }, false));
  }

  // Remove duplicates (same parameter sets)
  const uniqueParams = fallbackParams.filter((params, index, self) => {
    return index === self.findIndex((p) => JSON.stringify(p) === JSON.stringify(params));
  });

  return uniqueParams;
}

export function pickRandomItem<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick random item from empty array");
  }
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}
