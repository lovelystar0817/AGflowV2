import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { z } from "zod";

neonConfig.webSocketConstructor = ws;

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});

try {
  envSchema.parse(process.env);
} catch (error) {
  console.error("Environment variable validation failed:", error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });