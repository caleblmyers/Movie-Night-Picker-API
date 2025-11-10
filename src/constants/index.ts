/**
 * Password validation constants
 */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Rating validation constants
 */
export const MIN_RATING = 1;
export const MAX_RATING = 10;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Authentication required",
  INVALID_EMAIL_PASSWORD: "Invalid email or password",
  USER_EXISTS: "User with this email already exists",
  PASSWORD_TOO_SHORT: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
  RATING_INVALID: `Rating must be between ${MIN_RATING} and ${MAX_RATING}`,
  REVIEW_EMPTY: "Review content cannot be empty",
  COLLECTION_NOT_FOUND: "Collection not found",
  COLLECTION_NAME_EMPTY: "Collection name cannot be empty",
  COLLECTION_NO_ACCESS: "You don't have access to this collection",
  COLLECTION_NO_PERMISSION: "You don't have permission to modify this collection",
  NAME_CANNOT_BE_EMPTY: "Name cannot be empty",
  USER_NOT_FOUND: "User not found",
} as const;

/**
 * Movie vibes/moods for filtering
 */
export const MOVIE_VIBES = [
  { id: "lighthearted", label: "Lighthearted" },
  { id: "intense", label: "Intense" },
  { id: "emotional", label: "Emotional" },
  { id: "dark", label: "Dark" },
  { id: "wholesome", label: "Wholesome" },
  { id: "suspenseful", label: "Suspenseful" },
  { id: "fantasy", label: "Fantasy" },
  { id: "true-story", label: "True Story" },
  { id: "cozy", label: "Cozy" },
  { id: "uplifting", label: "Uplifting" },
  { id: "gritty", label: "Gritty" },
  { id: "thought-provoking", label: "Thought-Provoking" },
  { id: "chaotic", label: "Chaotic" },
  { id: "heartwarming", label: "Heartwarming" },
  { id: "somber", label: "Somber" },
  { id: "playful", label: "Playful" },
  { id: "nostalgic", label: "Nostalgic" },
  { id: "adventurous", label: "Adventurous" },
  { id: "mysterious", label: "Mysterious" },
  { id: "funny-comedic", label: "Funny / Comedic" },
  { id: "dramatic", label: "Dramatic" },
  { id: "atmospheric", label: "Atmospheric" },
  { id: "fast-paced", label: "Fast-Paced" },
  { id: "slow-burn", label: "Slow-Burn" },
  { id: "feel-good", label: "Feel-Good" },
  { id: "edge-of-your-seat", label: "Edge-of-Your-Seat" },
  { id: "mind-bending", label: "Mind-Bending" },
  { id: "chill-easy-watch", label: "Chill / Easy-Watch" },
  { id: "comfort-movie", label: "Comfort Movie" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "historical", label: "Historical" },
  { id: "futuristic", label: "Futuristic" },
  { id: "supernatural", label: "Supernatural" },
  { id: "crime-focused", label: "Crime-Focused" },
  { id: "survival", label: "Survival" },
  { id: "coming-of-age", label: "Coming-of-Age" },
  { id: "cult-classic-vibes", label: "Cult Classic Vibes" },
  { id: "indie-artsy", label: "Indie / Artsy" },
] as const;

/**
 * Map mood IDs to TMDB keyword IDs
 * Note: These are example keyword IDs - you may need to adjust based on actual TMDB keyword IDs
 */
export const MOOD_TO_KEYWORDS: Record<string, number[]> = {
  "lighthearted": [180547, 207317], // Comedy, Feel-good
  "intense": [207317, 9715], // Thriller, Suspense
  "emotional": [9715, 207317], // Drama, Emotional
  "dark": [9715, 207317], // Dark, Thriller
  "wholesome": [180547, 207317], // Family, Feel-good
  "suspenseful": [207317, 9715], // Thriller, Suspense
  "fantasy": [156024], // Fantasy
  "true-story": [207317], // Based on true story
  "cozy": [180547, 207317], // Comfort, Feel-good
  "uplifting": [180547, 207317], // Inspirational, Feel-good
  "gritty": [9715, 207317], // Crime, Drama
  "thought-provoking": [9715, 207317], // Drama, Philosophical
  "chaotic": [207317, 9715], // Action, Thriller
  "heartwarming": [180547, 207317], // Family, Feel-good
  "somber": [9715], // Drama, Melancholic
  "playful": [180547], // Comedy, Light
  "nostalgic": [207317], // Period piece, Retro
  "adventurous": [156024, 207317], // Adventure, Action
  "mysterious": [207317, 9715], // Mystery, Thriller
  "funny-comedic": [180547], // Comedy
  "dramatic": [9715], // Drama
  "atmospheric": [207317, 9715], // Atmospheric, Mood
  "fast-paced": [207317, 156024], // Action, Thriller
  "slow-burn": [9715], // Drama, Slow
  "feel-good": [180547, 207317], // Feel-good, Comedy
  "edge-of-your-seat": [207317, 9715], // Thriller, Suspense
  "mind-bending": [156024, 207317], // Sci-Fi, Psychological
  "chill-easy-watch": [180547, 207317], // Comedy, Light
  "comfort-movie": [180547, 207317], // Comfort, Feel-good
  "sci-fi": [156024], // Science Fiction
  "historical": [207317], // Historical
  "futuristic": [156024], // Sci-Fi, Future
  "supernatural": [156024, 207317], // Horror, Supernatural
  "crime-focused": [9715, 207317], // Crime, Thriller
  "survival": [207317, 156024], // Survival, Thriller
  "coming-of-age": [9715, 207317], // Coming of age, Drama
  "cult-classic-vibes": [207317], // Cult, Classic
  "indie-artsy": [9715, 207317], // Indie, Art house
} as const;

/**
 * Popularity level thresholds for TMDB movies
 * Based on typical TMDB popularity score ranges
 */
export const POPULARITY_LEVELS = {
  HIGH: { min: 100, max: Infinity }, // Very popular movies (blockbusters)
  AVERAGE: { min: 20, max: 100 }, // Moderately popular movies
  LOW: { min: 0, max: 20 }, // Less popular/niche movies
} as const;

/**
 * Convert popularity level to range
 */
export function getPopularityRange(level: "HIGH" | "AVERAGE" | "LOW"): [number, number] {
  const range = POPULARITY_LEVELS[level];
  return [range.min, range.max === Infinity ? 1000 : range.max]; // Cap at 1000 for API
}

/**
 * Era options for filtering movies by time period
 */
export const ERA_OPTIONS = [
  // Broad ranges
  { id: "70s-earlier", label: "70s & Earlier", value: "70s-earlier" },
  { id: "80s", label: "80s", value: "80s" },
  { id: "90s", label: "90s", value: "90s" },
  { id: "2000-2009", label: "2000–2009", value: "2000-2009" },
  { id: "2010-2019", label: "2010–2019", value: "2010-2019" },
  { id: "2020-present", label: "2020–Present", value: "2020-present" },
  // Abstract options
  { id: "classic", label: "Classic", value: "classic" },
  { id: "older-great", label: "Older but Great", value: "older-great" },
  { id: "newer-releases", label: "Newer Releases", value: "newer-releases" },
  { id: "golden-age", label: "Golden Age", value: "golden-age" },
  { id: "retro-favorites", label: "Retro Favorites", value: "retro-favorites" },
  { id: "vintage-gems", label: "Vintage Gems", value: "vintage-gems" },
  { id: "90s-nostalgia", label: "90s Nostalgia", value: "90s-nostalgia" },
  { id: "early-2000s-feel", label: "Early 2000s Feel", value: "early-2000s-feel" },
  { id: "modern-era", label: "Modern Era", value: "modern-era" },
  { id: "fresh-recent", label: "Fresh & Recent", value: "fresh-recent" },
  { id: "latest-trending", label: "Latest & Trending", value: "latest-trending" },
  { id: "throwbacks", label: "Throwbacks", value: "throwbacks" },
  { id: "timeless-picks", label: "Timeless Picks", value: "timeless-picks" },
  { id: "recent-hits", label: "Recent Hits", value: "recent-hits" },
  { id: "hidden-old-school-finds", label: "Hidden Old-School Finds", value: "hidden-old-school-finds" },
  { id: "pre-cgi-era", label: "Pre-CGI Era", value: "pre-cgi-era" },
  { id: "streaming-era-films", label: "Streaming-Era Films", value: "streaming-era-films" },
  { id: "blockbuster-era", label: "Blockbuster Era", value: "blockbuster-era" },
  { id: "contemporary-stories", label: "Contemporary Stories", value: "contemporary-stories" },
  { id: "old-hollywood-style", label: "Old Hollywood Style", value: "old-hollywood-style" },
  { id: "feels-like-80s", label: "Feels Like the 80s", value: "feels-like-80s" },
  { id: "feels-like-90s", label: "Feels Like the 90s", value: "feels-like-90s" },
  { id: "pre-millennium", label: "Pre-Millennium", value: "pre-millennium" },
  { id: "post-millennium", label: "Post-Millennium", value: "post-millennium" },
  { id: "pre-streaming-era", label: "Pre-Streaming Era", value: "pre-streaming-era" },
  { id: "streaming-era", label: "Streaming Era", value: "streaming-era" },
  { id: "post-covid-era", label: "Post-COVID Era", value: "post-covid-era" },
  { id: "late-night-classics", label: "Late-Night Classics", value: "late-night-classics" },
] as const;

/**
 * Map era IDs to year ranges [startYear, endYear]
 */
export function getEraYearRange(eraId: string): [number, number] | null {
  const currentYear = new Date().getFullYear();

  const eraMap: Record<string, [number, number]> = {
    // Broad ranges
    "70s-earlier": [1900, 1979],
    "80s": [1980, 1989],
    "90s": [1990, 1999],
    "2000-2009": [2000, 2009],
    "2010-2019": [2010, 2019],
    "2020-present": [2020, currentYear],
    // Abstract options - mapped to reasonable year ranges
    "classic": [1940, 1970],
    "older-great": [1970, 1990],
    "newer-releases": [2015, currentYear],
    "golden-age": [1930, 1960],
    "retro-favorites": [1980, 1999],
    "vintage-gems": [1960, 1980],
    "90s-nostalgia": [1990, 1999],
    "early-2000s-feel": [2000, 2005],
    "modern-era": [2010, currentYear],
    "fresh-recent": [2020, currentYear],
    "latest-trending": [2022, currentYear],
    "throwbacks": [1980, 1999],
    "timeless-picks": [1970, 2000],
    "recent-hits": [2018, currentYear],
    "hidden-old-school-finds": [1960, 1980],
    "pre-cgi-era": [1900, 1990],
    "streaming-era-films": [2015, currentYear],
    "blockbuster-era": [1975, 2000],
    "contemporary-stories": [2015, currentYear],
    "old-hollywood-style": [1930, 1960],
    "feels-like-80s": [1980, 1989],
    "feels-like-90s": [1990, 1999],
    "pre-millennium": [1900, 1999],
    "post-millennium": [2000, currentYear],
    "pre-streaming-era": [1900, 2014],
    "streaming-era": [2015, currentYear],
    "post-covid-era": [2021, currentYear],
    "late-night-classics": [1970, 2000],
  };

  return eraMap[eraId] || null;
}

/**
 * Movie vibe/mood icon mappings (Iconify icon identifiers)
 */
export const MOVIE_VIBE_ICONS: Record<string, string> = {
  lighthearted: "lucide:smile",
  intense: "lucide:flame",
  emotional: "lucide:heart-crack",
  dark: "lucide:moon",
  wholesome: "lucide:heart",
  suspenseful: "lucide:alert-triangle",
  fantasy: "lucide:sparkles",
  "true-story": "lucide:book-open-text",
  cozy: "lucide:mug-hot",
  uplifting: "lucide:sunrise",
  gritty: "lucide:landscape",
  "thought-provoking": "lucide:brain",
  chaotic: "lucide:wind",
  heartwarming: "lucide:heart-handshake",
  somber: "lucide:cloud-drizzle",
  playful: "lucide:ball",
  nostalgic: "lucide:clock",
  adventurous: "lucide:mountain",
  mysterious: "lucide:eye",
  "funny-comedic": "lucide:laugh",
  dramatic: "lucide:theater",
  atmospheric: "lucide:cloud",
  "fast-paced": "lucide:fast-forward",
  "slow-burn": "lucide:hourglass",
  "feel-good": "lucide:sun",
  "edge-of-your-seat": "lucide:zap",
  "mind-bending": "lucide:orbit",
  "chill-easy-watch": "lucide:couch",
  "comfort-movie": "lucide:home",
  "sci-fi": "lucide:alien",
  historical: "lucide:scroll-text",
  futuristic: "lucide:cpu",
  supernatural: "lucide:ghost",
  "crime-focused": "lucide:handcuffs",
  survival: "lucide:axe",
  "coming-of-age": "lucide:school",
  "cult-classic-vibes": "lucide:star",
  "indie-artsy": "lucide:palette",
} as const;

/**
 * Era option icon mappings (Iconify icon identifiers)
 */
export const ERA_OPTION_ICONS: Record<string, string> = {
  "70s-earlier": "lucide:radio",
  "80s": "lucide:disc",
  "90s": "lucide:gamepad",
  "2000-2009": "lucide:music",
  "2010-2019": "lucide:smartphone",
  "2020-present": "lucide:film",
  classic: "lucide:crown",
  "older-great": "lucide:archive",
  "newer-releases": "lucide:sparkles",
  "golden-age": "lucide:star",
  "retro-favorites": "lucide:album",
  "vintage-gems": "lucide:gem",
  "90s-nostalgia": "lucide:gamepad-2",
  "early-2000s-feel": "lucide:flip-phone",
  "modern-era": "lucide:laptop",
  "fresh-recent": "lucide:sparkle",
  "latest-trending": "lucide:trending-up",
  throwbacks: "lucide:undo",
  "timeless-picks": "lucide:infinity",
  "recent-hits": "lucide:flame",
  "hidden-old-school-finds": "lucide:treasure-chest",
  "pre-cgi-era": "lucide:camera",
  "streaming-era-films": "lucide:tv",
  "blockbuster-era": "lucide:megaphone",
  "contemporary-stories": "lucide:book-open",
  "old-hollywood-style": "lucide:drama",
  "feels-like-80s": "lucide:disc-3",
  "feels-like-90s": "lucide:headphones",
  "pre-millennium": "lucide:calendar-check",
  "post-millennium": "lucide:calendar-days",
  "pre-streaming-era": "lucide:clapperboard",
  "streaming-era": "lucide:play",
  "post-covid-era": "lucide:shield-check",
  "late-night-classics": "lucide:moon-star",
} as const;

/**
 * TMDB Genre icon mappings (Iconify icon identifiers)
 * Using official TMDB Genre IDs
 */
export const GENRE_ICONS: Record<number, string> = {
  28: "lucide:swords", // Action
  12: "lucide:mountain", // Adventure
  16: "lucide:palette", // Animation
  35: "lucide:laugh", // Comedy
  80: "lucide:handcuffs", // Crime
  99: "lucide:book-open-check", // Documentary
  18: "lucide:theater", // Drama
  10751: "lucide:heart", // Family
  14: "lucide:sparkles", // Fantasy
  36: "lucide:scroll", // History
  27: "lucide:ghost", // Horror
  10402: "lucide:music", // Music
  9648: "lucide:eye", // Mystery
  10749: "lucide:heart", // Romance
  878: "lucide:alien", // Sci-Fi
  10770: "lucide:tv", // TV Movie
  53: "lucide:alert-triangle", // Thriller
  10752: "lucide:target", // War
  37: "lucide:badge", // Western
} as const;

