import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stylists = pgTable("stylists", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  businessName: text("business_name"),
  // Profile fields
  phone: text("phone"),
  location: text("location"),
  servicesOffered: json("services_offered").$type<string[]>(),
  bio: text("bio"),
  businessHours: json("business_hours").$type<{
    [key: string]: { open: string; close: string; isClosed?: boolean };
  }>(),
  yearsOfExperience: integer("years_of_experience"),
  instagramHandle: text("instagram_handle"),
  bookingLink: text("booking_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced password validation schema
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*]/, "Password must contain at least one special character (!@#$%^&*)");

export const insertStylistSchema = createInsertSchema(stylists).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: passwordSchema,
});

export type InsertStylist = z.infer<typeof insertStylistSchema>;
export type Stylist = typeof stylists.$inferSelect;

// Business Hours validation schema
const businessHoursSchema = z.record(z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  isClosed: z.boolean().optional(),
}));

// Profile update schema for existing stylists
export const updateProfileSchema = z.object({
  phone: z.string().min(1, "Phone number is required").regex(/^[\d\s\-\(\)\+]+$/, "Invalid phone number format"),
  location: z.string().min(1, "Location is required"),
  servicesOffered: z.array(z.string()).min(1, "At least one service is required"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  businessHours: businessHoursSchema,
  yearsOfExperience: z.number().min(0, "Years of experience must be 0 or greater").max(50, "Years of experience must be 50 or less"),
  instagramHandle: z.string().optional(),
  bookingLink: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Helper function to check if profile is complete
export function isProfileComplete(stylist: Stylist): boolean {
  return !!(
    stylist.phone &&
    stylist.location &&
    stylist.servicesOffered &&
    stylist.bio &&
    stylist.businessHours
  );
}

// Clients table
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Legacy exports for compatibility with auth blueprint
export const users = stylists;
export const insertUserSchema = insertStylistSchema;
export type InsertUser = InsertStylist;
export type User = Stylist;
