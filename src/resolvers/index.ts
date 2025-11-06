import { Context } from '../context';

export interface Movie {
  id: number;
  title: string;
  overview?: string | null;
  posterUrl?: string | null;
}

// Mock movie data for now
const mockMovies: Movie[] = [
  {
    id: 1,
    title: 'The Shawshank Redemption',
    overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  },
  {
    id: 2,
    title: 'The Godfather',
    overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  },
  {
    id: 3,
    title: 'The Dark Knight',
    overview: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  },
];

export const resolvers = {
  Query: {
    suggestMovie: async (_: any, __: any, context: Context): Promise<Movie[]> => {
      // Return mock movies for now
      return mockMovies;
    },

    shuffleMovie: async (
      _: any,
      args: { genres?: string[]; yearRange?: number[]; crew?: string[] },
      context: Context
    ): Promise<Movie> => {
      // Return one mock movie for now
      // In the future, this will use TMDB API with the provided filters
      return mockMovies[0];
    },
  },
};

