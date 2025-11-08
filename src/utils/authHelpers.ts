import { User } from "@prisma/client";
import { Context } from "../context";

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Require authentication and return the authenticated user
 * Throws AuthenticationError if user is not authenticated
 */
export function requireAuth(context: Context): User {
  if (!context.user) {
    throw new AuthenticationError("Authentication required");
  }
  return context.user;
}

