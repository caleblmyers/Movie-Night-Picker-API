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
      try {
        // Validate input
        if (!args.email) {
          throw new Error("Email is required");
        }
        if (!args.password) {
          throw new Error("Password is required");
        }

        // Check if user already exists
        const existingUser = await context.prisma.user.findUnique({
          where: { email: args.email },
        });

        if (existingUser) {
          throw new Error(ERROR_MESSAGES.USER_EXISTS);
        }

        // Validate password
        const passwordValidation = validatePassword(args.password);
        if (!passwordValidation.valid) {
          throw new Error(passwordValidation.error);
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(args.password);
        
        // Set name to email by default
        const user = await context.prisma.user.create({
          data: {
            email: args.email,
            password: hashedPassword,
            name: args.email, // Default name to email
          },
        });

        // Generate token
        const token = generateToken({ userId: user.id, email: user.email });
        const userWithoutPassword = excludePassword(user);

        return {
          token,
          user: userWithoutPassword,
        };
      } catch (error) {
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

