# Movie Night Picker API

Backend API for Movie Night Picker - A personal movie discovery and recommendation platform that helps users find, save, and organize movies using data from The Movie Database (TMDB) API.

🔗 **Live Application**: [https://movie-night-picker-ochre.vercel.app/](https://movie-night-picker-ochre.vercel.app/)  
📦 **Frontend Repository**: [https://github.com/caleblmyers/Movie-Night-Picker](https://github.com/caleblmyers/Movie-Night-Picker)

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

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

