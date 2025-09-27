/**
 * Environment-aware configuration system for staging and production
 */

import { env as prodEnv } from "./db";
import { stagingEnv } from "./staging-db";

export const getEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  
  switch (nodeEnv) {
    case "staging":
      return {
        environment: "staging" as const,
        database: {
          url: stagingEnv.STAGING_DATABASE_URL,
        },
        apis: {
          resend: stagingEnv.STAGING_RESEND_API_KEY,
          openai: stagingEnv.STAGING_OPENAI_API_KEY,
        },
        session: {
          secret: stagingEnv.STAGING_SESSION_SECRET,
        },
        app: {
          domain: process.env.STAGING_DOMAIN || "staging.localhost:5000",
          emailDomain: process.env.STAGING_EMAIL_DOMAIN || "staging.example.com",
        }
      };
    
    case "production":
      return {
        environment: "production" as const,
        database: {
          url: prodEnv.DATABASE_URL,
        },
        apis: {
          resend: prodEnv.RESEND_API_KEY,
          openai: prodEnv.OPENAI_API_KEY,
        },
        session: {
          secret: process.env.SESSION_SECRET || "",
        },
        app: {
          domain: process.env.PROD_DOMAIN || "app.example.com",
          emailDomain: process.env.PROD_EMAIL_DOMAIN || "example.com",
        }
      };
    
    default: // development
      return {
        environment: "development" as const,
        database: {
          url: prodEnv.DATABASE_URL,
        },
        apis: {
          resend: prodEnv.RESEND_API_KEY,
          openai: prodEnv.OPENAI_API_KEY,
        },
        session: {
          secret: process.env.SESSION_SECRET || "dev-session-secret-key",
        },
        app: {
          domain: "localhost:5000",
          emailDomain: "dev.example.com",
        }
      };
  }
};

export const config = getEnvironmentConfig();
export type AppConfig = ReturnType<typeof getEnvironmentConfig>;