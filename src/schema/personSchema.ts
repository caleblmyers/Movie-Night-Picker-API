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
    searchPeople(query: String!): [Person!]!

    # Get a completely random person
    randomPerson: Person
  }
`;

