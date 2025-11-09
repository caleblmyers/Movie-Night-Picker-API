import { gql } from "graphql-tag";

export const personSchema = gql`
  type Person {
    id: Int!
    name: String!
    biography: String
    profileUrl: String
    birthday: String
    placeOfBirth: String
    knownForDepartment: String
    popularity: Float
  }

  extend type Query {
    # Get a single person by TMDB ID
    getPerson(id: Int!): Person

    # Search people by query string (smart search with fuzzy matching)
    # TMDB automatically performs case-insensitive partial matching
    # limit: Maximum number of results to return (default: 20, max: 100)
    # roleType: Filter by "actor", "crew" (directors/writers), or "both" (default: "both")
    searchPeople(
      query: String!
      limit: Int
      roleType: PersonRoleType
      options: TMDBOptionsInput
    ): [Person!]!

    # Get a completely random person
    randomPerson: Person

    # Get trending people
    # timeWindow: "day" or "week" (default: "day")
    # roleType: Filter by "actor", "crew" (directors/writers), or "both" (default: "both")
    trendingPeople(
      timeWindow: TrendingTimeWindow
      roleType: PersonRoleType
      options: TMDBOptionsInput
    ): [Person!]!
  }

  enum PersonRoleType {
    ACTOR
    CREW
    BOTH
  }
`;

