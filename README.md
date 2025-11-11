# Movie Night Picker API

Backend API for Movie Night Picker - A personal movie discovery and recommendation platform that helps users find, save, and organize movies using data from The Movie Database (TMDB) API.

## Overview

This is the GraphQL API backend that powers the Movie Night Picker frontend application. It provides a comprehensive GraphQL interface for searching movies, discovering recommendations, managing personal collections, and tracking viewing history. The API integrates with The Movie Database (TMDB) API to fetch movie data, cast information, trailers, and more.

## Tech Stack

- **Node.js** 20.x
- **Express.js** 5.x
- **Apollo Server** 4.x (GraphQL)
- **TypeScript**
- **Prisma** (ORM)
- **PostgreSQL**
- **Axios**
- **JWT** (Authentication)
- **bcryptjs** (Password hashing)
- **dotenv**
- **cors**

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- PostgreSQL (or Docker for local development)
- TMDB API Key (free account)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd movie-night-picker-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/movie_night_picker?schema=public"

# TMDB API
TMDB_API_KEY="your_tmdb_api_key"

# JWT Secret (generate a secure random string)
JWT_SECRET="your_jwt_secret_key"

# Application
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

**Getting TMDB API Key:**

1. Go to [TMDB Developer Portal](https://www.themoviedb.org/settings/api)
2. Create a free account
3. Request an API key
4. Copy your API key to the `.env` file

**Generating JWT Secret:**

You can generate a secure JWT secret using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Set Up Database

**Option A: Using Docker Compose (Recommended for Local Development)**

```bash
docker-compose up -d
```

This will start a PostgreSQL container on port 5432 with:
- Database: `movie_night_picker`
- User: `postgres`
- Password: `postgres`

**Option B: Using Existing PostgreSQL**

Ensure your `DATABASE_URL` in `.env` points to your PostgreSQL instance.

### 5. Run Database Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Start the Development Server

```bash
npm run dev
```

The GraphQL API will be available at `http://localhost:4000/graphql`

## GraphQL API

This API uses GraphQL instead of REST endpoints. You can access the GraphQL Playground at `http://localhost:4000/graphql` in development mode.

### Authentication

Most queries and mutations require authentication. Include a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Key Features

#### Movies
- **Search Movies**: Smart search with fuzzy matching
- **Discover Movies**: Advanced filtering by genres, keywords, actors, crew, year range, popularity, and more
- **Shuffle Movie**: Get a random movie based on customizable filters
- **Suggest Movie**: Multi-round movie suggestion system based on user preferences
- **Random Movie**: Get completely random movies from trending, popular, top-rated, or upcoming sources
- **Movie Details**: Full movie information including cast, crew, trailers, keywords, and genres

#### People (Actors & Directors)
- **Search People**: Search for actors, directors, and other film industry professionals
- **Person Details**: Get person information including filmography
- **Random Actors**: Get random actors from trending, popular, or top-rated sources

#### Collections
- **Create Collections**: Organize movies into custom collections
- **Collection Insights**: Get analytics about your collections (genres, keywords, actors, year ranges, etc.)
- **Collection Analysis**: Extract top genres, keywords, and actors from collections for filtering
- **Collection Filtering**: Filter movie searches by collection membership

#### User Features
- **Authentication**: Register and login with JWT tokens
- **Saved Movies**: Save movies to a default "Saved Movies" collection
- **Ratings**: Rate movies (1-5 or 1-10 scale)
- **Reviews**: Write reviews for movies
- **Movie History**: Track watched movies

### Example Queries

**Search Movies:**
```graphql
query {
  searchMovies(query: "Inception", limit: 10) {
    id
    title
    overview
    posterUrl
    releaseDate
    voteAverage
  }
}
```

**Discover Movies with Filters:**
```graphql
query {
  discoverMovies(
    genres: [28, 12]
    yearRange: [2010, 2020]
    popularityLevel: HIGH
  ) {
    id
    title
    posterUrl
    genres {
      id
      name
    }
  }
}
```

**Shuffle Movie:**
```graphql
query {
  shuffleMovie(
    genres: [28]
    yearRange: [2010, 2020]
    minVoteAverage: 7.0
  ) {
    id
    title
    overview
    trailer {
      key
      site
    }
  }
}
```

**Get Collection Insights:**
```graphql
query {
  collectionInsights(collectionId: 1) {
    totalMovies
    uniqueGenres
    topActors {
      person {
        id
        name
      }
      count
    }
    yearRange {
      min
      max
    }
  }
}
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run start:prod` - Deploy migrations and start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
src/
├── schema/          # GraphQL schema definitions
├── resolvers/       # GraphQL resolvers
├── datasources/     # TMDB API integration
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── context.ts       # GraphQL context creation
└── server.ts        # Express server setup
```

## License

This project is licensed under the ISC License.

## TMDB API Attribution

This project uses The Movie Database (TMDB) API to fetch movie data.

**Important Notes:**

- All movie data, including movie information, cast details, crew information, trailers, and metadata, is provided by TMDB.
- This application is not affiliated with, endorsed by, or sponsored by TMDB.
- TMDB content is subject to TMDB's Terms of Service.
- All TMDB trademarks, logos, and brand features are the property of TMDB.

**TMDB Developer Resources:**

- [TMDB Developer Portal](https://www.themoviedb.org/documentation/api)
- [TMDB API Documentation](https://developers.themoviedb.org/3/getting-started/introduction)
- [TMDB Terms of Service](https://www.themoviedb.org/terms-of-use)

