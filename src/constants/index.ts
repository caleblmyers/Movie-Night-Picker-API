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

