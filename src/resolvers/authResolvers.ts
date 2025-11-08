import { Context } from "../context";
import { hashPassword, verifyPassword, generateToken } from "../utils/auth";
import { handleError } from "../utils/errorHandler";
import { excludePassword, validatePassword } from "../utils/userHelpers";
import { AuthArgs, AuthPayload } from "../types/resolvers";
import { ERROR_MESSAGES } from "../constants";

export const authResolvers = {
  Mutation: {
    register: async (
      _parent: unknown,
      args: AuthArgs,
      context: Context
    ): Promise<AuthPayload> => {
      console.log("[REGISTER] Starting registration process");
      console.log("[REGISTER] Email:", args.email);
      console.log("[REGISTER] Password length:", args.password?.length || 0);
      
      try {
        // Validate input
        if (!args.email) {
          console.error("[REGISTER] Error: Email is missing");
          throw new Error("Email is required");
        }
        if (!args.password) {
          console.error("[REGISTER] Error: Password is missing");
          throw new Error("Password is required");
        }

        console.log("[REGISTER] Checking if user already exists...");
        // Check if user already exists
        const existingUser = await context.prisma.user.findUnique({
          where: { email: args.email },
        });

        if (existingUser) {
          console.error("[REGISTER] Error: User already exists with email:", args.email);
          throw new Error(ERROR_MESSAGES.USER_EXISTS);
        }
        console.log("[REGISTER] User does not exist, proceeding...");

        // Validate password
        console.log("[REGISTER] Validating password...");
        const passwordValidation = validatePassword(args.password);
        if (!passwordValidation.valid) {
          console.error("[REGISTER] Error: Password validation failed:", passwordValidation.error);
          throw new Error(passwordValidation.error);
        }
        console.log("[REGISTER] Password validation passed");

        // Hash password and create user
        console.log("[REGISTER] Hashing password...");
        const hashedPassword = await hashPassword(args.password);
        console.log("[REGISTER] Password hashed, creating user in database...");
        console.log("[REGISTER] Database connection check...");
        
        try {
          // Set name to email by default
          const user = await context.prisma.user.create({
            data: {
              email: args.email,
              password: hashedPassword,
              name: args.email, // Default name to email
            },
          });
          console.log("[REGISTER] User created successfully with ID:", user.id);
          console.log("[REGISTER] User email:", user.email);
          console.log("[REGISTER] User name:", user.name);
          console.log("[REGISTER] User createdAt:", user.createdAt);

          // Generate token
          console.log("[REGISTER] Generating JWT token...");
          const token = generateToken({ userId: user.id, email: user.email });
          console.log("[REGISTER] Token generated successfully");
          
          const userWithoutPassword = excludePassword(user);
          console.log("[REGISTER] Password excluded from response");
          console.log("[REGISTER] Registration completed successfully for user:", user.id);

          return {
            token,
            user: userWithoutPassword,
          };
        } catch (dbError) {
          console.error("[REGISTER] Database error:", dbError);
          if (dbError instanceof Error) {
            console.error("[REGISTER] Database error message:", dbError.message);
            console.error("[REGISTER] Database error name:", dbError.name);
            console.error("[REGISTER] Database error stack:", dbError.stack);
          }
          throw dbError;
        }
      } catch (error) {
        console.error("[REGISTER] Registration failed with error:", error);
        if (error instanceof Error) {
          console.error("[REGISTER] Error message:", error.message);
          console.error("[REGISTER] Error stack:", error.stack);
        }
        throw handleError(error, "Failed to register user");
      }
    },

    login: async (
      _parent: unknown,
      args: AuthArgs,
      context: Context
    ): Promise<AuthPayload> => {
      try {
        // Find user by email
        const user = await context.prisma.user.findUnique({
          where: { email: args.email },
        });

        if (!user) {
          throw new Error(ERROR_MESSAGES.INVALID_EMAIL_PASSWORD);
        }

        // Verify password
        const isValid = await verifyPassword(args.password, user.password);
        if (!isValid) {
          throw new Error(ERROR_MESSAGES.INVALID_EMAIL_PASSWORD);
        }

        // Generate token
        const token = generateToken({ userId: user.id, email: user.email });

        return {
          token,
          user: excludePassword(user),
        };
      } catch (error) {
        throw handleError(error, "Failed to login");
      }
    },
  },
};

