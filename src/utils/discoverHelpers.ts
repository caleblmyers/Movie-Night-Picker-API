import { DiscoverParams } from "../types";

export interface DiscoverFilters {
  genres?: string[];
  yearRange?: number[];
  cast?: number[];
  actors?: number[];
}

export function buildDiscoverParams(
  filters: DiscoverFilters,
  useSingle: boolean = false
): DiscoverParams {
  const params: DiscoverParams = {};

  if (filters.genres && filters.genres.length > 0) {
    params.genres = useSingle ? [filters.genres[0]] : filters.genres;
  }

  if (filters.yearRange && filters.yearRange.length === 2) {
    params.yearRange = filters.yearRange;
  }

  // Support both 'cast' and 'actors' for flexibility
  const actors = filters.actors || filters.cast;
  if (actors && actors.length > 0) {
    params.actors = useSingle ? [actors[0]] : actors;
  }

  return params;
}

export function shouldTryFallback(filters: DiscoverFilters): boolean {
  const hasMultipleGenres = !!(filters.genres && filters.genres.length > 1);
  const actors = filters.actors || filters.cast;
  const hasMultipleActors = !!(actors && actors.length > 1);
  return hasMultipleGenres || hasMultipleActors;
}

export function pickRandomItem<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick random item from empty array");
  }
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}
