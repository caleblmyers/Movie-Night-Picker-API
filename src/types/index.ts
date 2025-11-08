export interface Movie {
  id: number;
  title: string;
  overview?: string | null;
  posterUrl?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

export interface Person {
  id: number;
  name: string;
  biography?: string | null;
  profileUrl?: string | null;
  birthday?: string | null;
  placeOfBirth?: string | null;
  knownForDepartment?: string | null;
  popularity?: number | null;
}

export interface DiscoverParams {
  genres?: string[];
  yearRange?: number[];
  actors?: number[];
}

// Re-export resolver types for convenience
export * from "./resolvers";