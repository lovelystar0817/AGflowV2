import { defineConfig } from "drizzle-kit";

if (!process.env.DB_URL) {
  throw new Error("DB_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_URL,
  },
});
