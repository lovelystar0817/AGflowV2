/**
 * Feature flags configuration
 * Controls which features are enabled/disabled in the application
 */
export const FEATURES = {
  customizeApp: false,
} as const;

export type FeatureFlags = typeof FEATURES;
