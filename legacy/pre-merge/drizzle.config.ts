import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DB_URL or DATABASE_URL environment variable required");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
