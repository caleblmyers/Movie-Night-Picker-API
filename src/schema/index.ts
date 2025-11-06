import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Movie {
    id: Int!
    title: String!
    overview: String
    posterUrl: String
  }

  type Query {
    suggestMovie: [Movie!]!
    shuffleMovie(genres: [String!], yearRange: [Int!], crew: [String!]): Movie
  }
`;

