import { User } from "@prisma/client";
import { UserWithoutPassword } from "../types/resolvers";

/**
 * Remove password field from user object
 */
export function excludePassword(user: User): UserWithoutPassword {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters long" };
  }
  return { valid: true };
}

