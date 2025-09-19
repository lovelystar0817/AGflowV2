import { z } from "zod";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const envSchema = z.object({
  DB_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  OPENAI_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid or missing environment variables", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

export const pool = new Pool({ connectionString: env.DB_URL });
export const db = drizzle({ client: pool, schema });
