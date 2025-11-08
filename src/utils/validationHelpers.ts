import { ERROR_MESSAGES } from "../constants";

/**
 * Validate that a string is not empty after trimming
 */
export function validateNonEmptyString(
  value: string | null | undefined,
  fieldName: string = "Field"
): string {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  return value.trim();
}

/**
 * Validate collection name
 */
export function validateCollectionName(name: string | null | undefined): string {
  return validateNonEmptyString(name, "Collection name");
}

/**
 * Validate user name
 */
export function validateUserName(name: string | null | undefined): string {
  return validateNonEmptyString(name, "Name");
}

