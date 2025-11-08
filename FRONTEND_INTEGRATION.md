# Frontend Integration Guide

This guide provides step-by-step instructions for integrating the movie picker flow with the GraphQL API.

## Overview

The movie picker flow allows users to select from various categories (genre, mood, era, actor, crew) and uses those selections to discover a movie via the TMDB API. The system uses progressive fallback logic to ensure results are found even with restrictive criteria.

## GraphQL Queries

### 1. Get Selection Options

Fetch all available options for the picker interface:

```graphql
query GetMovieSelectionOptions {
  movieSelectionOptions {
    genres {
      id
      name
    }
    moods {
      id
      label
    }
    eras {
      id
      label
      value
    }
  }
}
```

**Response Structure:**
- `genres`: Array of TMDB genres (e.g., Action, Comedy, Drama)
- `moods`: Array of mood options (e.g., "dark", "lighthearted", "suspenseful")
- `eras`: Array of era options (e.g., "80s", "streaming-era-films", "classic")

### 2. Get Actors from Featured Movies

Fetch actors from top rated, popular, and now playing movies:

```graphql
query GetActorsFromFeaturedMovies($options: TMDBOptionsInput) {
  actorsFromFeaturedMovies(options: $options) {
    id
    name
    profileUrl
  }
}
```

**Variables:**
```json
{
  "options": {
    "region": "US",
    "language": "en-US",
    "page": 1
  }
}
```

### 3. Get Crew (Directors/Writers) from Featured Movies

Fetch directors and writers from top rated, popular, and now playing movies:

```graphql
query GetCrewFromFeaturedMovies($options: TMDBOptionsInput) {
  crewFromFeaturedMovies(options: $options) {
    id
    name
    profileUrl
  }
}
```

**Variables:**
```json
{
  "options": {
    "region": "US",
    "language": "en-US",
    "page": 1
  }
}
```

### 4. Suggest Movie

Submit user selections and get a movie suggestion:

```graphql
mutation SuggestMovie($preferences: MoviePreferencesInput!) {
  suggestMovie(preferences: $preferences) {
    id
    title
    overview
    posterUrl
    releaseDate
    voteAverage
    voteCount
  }
}
```

**Variables Example:**
```json
{
  "preferences": {
    "genres": ["28"],
    "actors": [4870696],
    "crew": [947],
    "mood": "survival",
    "era": "streaming-era-films",
    "options": {
      "region": "US",
      "language": "en-US"
    }
  }
}
```

## Frontend Implementation Steps

### Step 1: Load Selection Options

On component mount, fetch all available options:

```typescript
// Example using Apollo Client
const { data, loading, error } = useQuery(GET_MOVIE_SELECTION_OPTIONS);

if (data) {
  const { genres, moods, eras } = data.movieSelectionOptions;
  // Populate your selection UI components
}
```

### Step 2: Load Actors and Crew

Fetch actors and crew from featured movies:

```typescript
const { data: actorsData } = useQuery(GET_ACTORS_FROM_FEATURED_MOVIES, {
  variables: { options: { region: "US", language: "en-US" } }
});

const { data: crewData } = useQuery(GET_CREW_FROM_FEATURED_MOVIES, {
  variables: { options: { region: "US", language: "en-US" } }
});
```

### Step 3: Build User Selection State

Create state to track user selections:

```typescript
interface MoviePreferences {
  genres?: string[];
  actors?: number[];
  crew?: number[];
  mood?: string;
  era?: string;
}

const [preferences, setPreferences] = useState<MoviePreferences>({});
```

### Step 4: Handle User Selections

Update state as user makes selections:

```typescript
// Genre selection
const handleGenreSelect = (genreId: string) => {
  setPreferences(prev => ({
    ...prev,
    genres: prev.genres ? [...prev.genres, genreId] : [genreId]
  }));
};

// Mood selection
const handleMoodSelect = (moodId: string) => {
  setPreferences(prev => ({ ...prev, mood: moodId }));
};

// Era selection
const handleEraSelect = (eraId: string) => {
  setPreferences(prev => ({ ...prev, era: eraId }));
};

// Actor selection
const handleActorSelect = (actorId: number) => {
  setPreferences(prev => ({
    ...prev,
    actors: prev.actors ? [...prev.actors, actorId] : [actorId]
  }));
};

// Crew selection
const handleCrewSelect = (crewId: number) => {
  setPreferences(prev => ({
    ...prev,
    crew: prev.crew ? [...prev.crew, crewId] : [crewId]
  }));
};
```

### Step 5: Submit and Get Movie Suggestion

When user clicks "Find Movie", submit the preferences:

```typescript
const [suggestMovie, { data: movieData, loading: suggesting }] = useMutation(SUGGEST_MOVIE);

const handleFindMovie = async () => {
  try {
    const result = await suggestMovie({
      variables: {
        preferences: {
          ...preferences,
          options: {
            region: "US",
            language: "en-US"
          }
        }
      }
    });
    
    if (result.data?.suggestMovie) {
      // Display the suggested movie
      setSuggestedMovie(result.data.suggestMovie);
    }
  } catch (error) {
    // Handle error (e.g., no movies found)
    console.error("Failed to suggest movie:", error);
  }
};
```

## Progressive Fallback Logic

The `suggestMovie` query automatically uses progressive fallback if no results are found:

1. **First attempt**: Uses all provided parameters (genres, actors, crew, mood, era)
2. **If no results**: Removes mood filter
3. **If still no results**: Removes crew filter (if both crew and actors provided)
4. **If still no results**: Removes actors filter
5. **If still no results**: Reduces to single genre (if multiple genres)
6. **If still no results**: Removes era filter
7. **If still no results**: Removes year range filter
8. **If still no results**: Tries with only genres
9. **If still no results**: Tries with only year range/era

This ensures that a movie is found even with very restrictive criteria.

## Error Handling

The API will throw an error if no movies are found after all fallback attempts:

```typescript
try {
  const result = await suggestMovie({ variables: { preferences } });
} catch (error) {
  if (error.message.includes("No movies found")) {
    // Show user-friendly message
    setErrorMessage("No movies found. Try adjusting your selections.");
  }
}
```

## Complete Example Component

```typescript
import { useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';

const MoviePicker = () => {
  const [preferences, setPreferences] = useState({
    genres: [],
    actors: [],
    crew: [],
    mood: null,
    era: null
  });

  // Load options
  const { data: optionsData } = useQuery(GET_MOVIE_SELECTION_OPTIONS);
  const { data: actorsData } = useQuery(GET_ACTORS_FROM_FEATURED_MOVIES);
  const { data: crewData } = useQuery(GET_CREW_FROM_FEATURED_MOVIES);

  // Suggest movie
  const [suggestMovie, { data: movieData, loading }] = useMutation(SUGGEST_MOVIE);

  const handleSubmit = () => {
    suggestMovie({
      variables: {
        preferences: {
          ...preferences,
          options: { region: "US", language: "en-US" }
        }
      }
    });
  };

  return (
    <div>
      {/* Genre Selection */}
      <GenreSelector
        genres={optionsData?.movieSelectionOptions.genres}
        onSelect={(id) => setPreferences(prev => ({
          ...prev,
          genres: [...prev.genres, id]
        }))}
      />

      {/* Mood Selection */}
      <MoodSelector
        moods={optionsData?.movieSelectionOptions.moods}
        onSelect={(id) => setPreferences(prev => ({ ...prev, mood: id }))}
      />

      {/* Era Selection */}
      <EraSelector
        eras={optionsData?.movieSelectionOptions.eras}
        onSelect={(id) => setPreferences(prev => ({ ...prev, era: id }))}
      />

      {/* Actor Selection */}
      <ActorSelector
        actors={actorsData?.actorsFromFeaturedMovies}
        onSelect={(id) => setPreferences(prev => ({
          ...prev,
          actors: [...prev.actors, id]
        }))}
      />

      {/* Crew Selection */}
      <CrewSelector
        crew={crewData?.crewFromFeaturedMovies}
        onSelect={(id) => setPreferences(prev => ({
          ...prev,
          crew: [...prev.crew, id]
        }))}
      />

      {/* Submit Button */}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Finding Movie...' : 'Find Movie'}
      </button>

      {/* Display Result */}
      {movieData?.suggestMovie && (
        <MovieCard movie={movieData.suggestMovie} />
      )}
    </div>
  );
};
```

## Notes

- **Genre IDs**: Use string format (e.g., "28" for Action) as returned by TMDB
- **Actor/Crew IDs**: Use integer format (e.g., 4870696)
- **Mood/Era IDs**: Use the string IDs from the selection options query
- **Progressive Fallback**: Happens automatically - no frontend changes needed
- **Performance**: Actors and crew extraction is limited to first 20 movies from each list to avoid excessive API calls

