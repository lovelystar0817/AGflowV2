import { defineConfig } from "drizzle-kit";

// Staging environment configuration for database migrations
if (!process.env.STAGING_DATABASE_URL) {
  throw new Error("STAGING_DATABASE_URL is required for staging environment");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.STAGING_DATABASE_URL,
  },
});