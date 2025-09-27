import { z } from "zod";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Staging environment variables schema
const stagingEnvSchema = z.object({
  STAGING_DATABASE_URL: z.string().url(),
  STAGING_RESEND_API_KEY: z.string().min(1),
  STAGING_OPENAI_API_KEY: z.string().min(1),
  STAGING_SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.string().default("staging"),
});

// Only validate staging environment variables when NODE_ENV is staging
let stagingEnv: z.infer<typeof stagingEnvSchema>;

if (process.env.NODE_ENV === "staging") {
  const parsed = stagingEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid or missing staging environment variables", parsed.error.format());
    process.exit(1);
  }
  stagingEnv = parsed.data;
} else {
  // Provide default values for non-staging environments
  stagingEnv = {
    STAGING_DATABASE_URL: process.env.STAGING_DATABASE_URL || "postgres://placeholder",
    STAGING_RESEND_API_KEY: process.env.STAGING_RESEND_API_KEY || "placeholder",
    STAGING_OPENAI_API_KEY: process.env.STAGING_OPENAI_API_KEY || "placeholder",
    STAGING_SESSION_SECRET: process.env.STAGING_SESSION_SECRET || "placeholder-session-secret-32-chars",
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

export { stagingEnv };

// Only create staging database connection in staging environment
export const stagingPool = process.env.NODE_ENV === "staging" 
  ? new Pool({ connectionString: stagingEnv.STAGING_DATABASE_URL })
  : null;

export const stagingDb = process.env.NODE_ENV === "staging" && stagingPool
  ? drizzle({ client: stagingPool, schema })
  : null;