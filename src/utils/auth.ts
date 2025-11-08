import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";
const BCRYPT_SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: number;
  email: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  console.log("[AUTH] Generating token for user:", payload.userId, payload.email);
  console.log("[AUTH] JWT_SECRET configured:", !!JWT_SECRET);
  console.log("[AUTH] JWT_EXPIRES_IN:", JWT_EXPIRES_IN);
  
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
    console.log("[AUTH] Token generated successfully, length:", token.length);
    return token;
  } catch (error) {
    console.error("[AUTH] Error generating token:", error);
    throw error;
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

