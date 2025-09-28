import { eq } from "drizzle-orm";
import { stylists } from "../migrations/schema";
import { db } from "./db";

/**
 * Generates a URL-friendly slug from text
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlugFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[\s\W]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    .replace(/-+$/, ''); // Remove trailing hyphens after truncation
}

/**
 * Generates a unique appSlug for a stylist
 * @param businessName - The business name to generate slug from
 * @param firstName - Fallback first name if businessName is empty
 * @param lastName - Fallback last name if businessName is empty
 * @param excludeId - Optional stylist ID to exclude from uniqueness check (for updates)
 * @returns A unique appSlug
 */
export async function generateUniqueAppSlug(
  businessName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
  excludeId?: string
): Promise<string> {
  // Determine base text for slug generation
  let baseText = '';
  
  if (businessName && businessName.trim()) {
    baseText = businessName.trim();
  } else if (firstName && lastName) {
    baseText = `${firstName.trim()} ${lastName.trim()}`;
  } else if (firstName) {
    baseText = firstName.trim();
  } else if (lastName) {
    baseText = lastName.trim();
  } else {
    // Fallback to a generic name with timestamp
    baseText = `stylist-${Date.now()}`;
  }

  const baseSlug = generateSlugFromText(baseText);
  let candidateSlug = baseSlug;
  let counter = 2;

  // Check for uniqueness and append numbers if needed
  while (await isSlugTaken(candidateSlug, excludeId)) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
    
    // Prevent infinite loops
    if (counter > 1000) {
      candidateSlug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return candidateSlug;
}

/**
 * Checks if a given appSlug is already taken by another stylist
 * @param slug - The slug to check
 * @param excludeId - Optional stylist ID to exclude from the check
 * @returns true if the slug is taken, false otherwise
 */
async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  try {
    const query = db
      .select({ id: stylists.id })
      .from(stylists)
      .where(eq(stylists.appSlug, slug))
      .limit(1);

    const existingStylists = await query;
    
    if (existingStylists.length === 0) {
      return false;
    }

    // If excludeId is provided, check if the found stylist is the one we're excluding
    if (excludeId && existingStylists[0].id === excludeId) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking slug uniqueness:', error);
    // On error, assume slug is taken to be safe
    return true;
  }
}

/**
 * Updates a stylist's appSlug if they don't have one
 * @param stylistId - The stylist's ID
 * @param businessName - The business name
 * @param firstName - The first name
 * @param lastName - The last name
 * @returns The generated appSlug or null if stylist already has one
 */
export async function ensureStylistHasAppSlug(
  stylistId: string,
  businessName?: string | null,
  firstName?: string | null,
  lastName?: string | null
): Promise<string | null> {
  try {
    // Check if stylist already has an appSlug
    const existingStylist = await db
      .select({ appSlug: stylists.appSlug })
      .from(stylists)
      .where(eq(stylists.id, stylistId))
      .limit(1);

    if (existingStylist.length === 0) {
      throw new Error('Stylist not found');
    }

    if (existingStylist[0].appSlug) {
      // Stylist already has an appSlug
      return existingStylist[0].appSlug;
    }

    // Generate new appSlug
    const newAppSlug = await generateUniqueAppSlug(businessName, firstName, lastName, stylistId);

    // Update the stylist
    await db
      .update(stylists)
      .set({ appSlug: newAppSlug })
      .where(eq(stylists.id, stylistId));

    return newAppSlug;
  } catch (error) {
    console.error('Error ensuring stylist has appSlug:', error);
    return null;
  }
}