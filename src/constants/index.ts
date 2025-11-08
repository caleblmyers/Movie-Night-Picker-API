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
} as const;

