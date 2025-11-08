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

    # Search people by query string
    # roleType: Filter by "actor", "crew" (directors/writers), or "both" (default: "both")
    searchPeople(
      query: String!
      roleType: PersonRoleType
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

