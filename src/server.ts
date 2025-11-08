import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { createContext } from "./context";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // Enable GraphQL playground in development
    formatError: (error) => {
      console.error("[APOLLO ERROR] GraphQL Error:", error.message);
      console.error("[APOLLO ERROR] Error path:", error.path);
      console.error("[APOLLO ERROR] Error locations:", error.locations);
      if ('originalError' in error && error.originalError) {
        console.error("[APOLLO ERROR] Original error:", error.originalError);
      }
      if (error.extensions) {
        console.error("[APOLLO ERROR] Error extensions:", JSON.stringify(error.extensions, null, 2));
      }
      return error;
    },
  });

  await server.start();

  // Request logging middleware
  app.use("/graphql", (req, res, next) => {
    console.log("[REQUEST] Incoming GraphQL request");
    console.log("[REQUEST] Method:", req.method);
    if (req.body) {
      console.log("[REQUEST] Body:", JSON.stringify(req.body, null, 2));
    }
    next();
  });

  // Apply CORS and body-parser middleware, then Apollo GraphQL middleware
  app.use(
    "/graphql",
    cors({
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    }),
    bodyParser.json(),
    expressMiddleware(server, {
      context: createContext,
    })
  );

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, () => {
    console.log("Movie Night Picker backend running on port 4000");
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
