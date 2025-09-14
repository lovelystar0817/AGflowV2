import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar, json, integer, serial, decimal, boolean, date, uniqueIndex } from "drizzle-orm/pg-core";
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

// Stylist Services table for individual services with pricing
export const stylistServices = pgTable("stylist_services", {
  id: serial("id").primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  serviceName: text("service_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
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

// Stylist Services schemas
export const insertStylistServiceSchema = createInsertSchema(stylistServices).omit({
  id: true,
  createdAt: true,
});

export const serviceSchema = z.object({
  serviceName: z.string().min(1, "Service name is required").max(100, "Service name must be 100 characters or less"),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 9999.99;
  }, "Price must be a valid number between 0.01 and 9999.99"),
  isCustom: z.boolean().default(false),
});

// Helper schema for form validation with number inputs
export const serviceFormSchema = z.object({
  serviceName: z.string().min(1, "Service name is required").max(100, "Service name must be 100 characters or less"),
  price: z.number().positive("Price must be greater than 0").max(9999.99, "Price must be less than $10,000"),
  isCustom: z.boolean().default(false),
});

export type InsertStylistService = z.infer<typeof insertStylistServiceSchema>;
export type StylistService = typeof stylistServices.$inferSelect;

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
  services: z.array(serviceFormSchema).min(1, "At least one service is required"),
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

// Stylist Availability table for daily time ranges
export const stylistAvailability = pgTable("stylist_availability", {
  id: serial("id").primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  date: date("date").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
  timeRanges: json("time_ranges").$type<{ start: string; end: string }[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  stylistDateUnique: uniqueIndex("stylist_availability_u_stylist_date").on(table.stylistId, table.date),
}));

// Time range validation schemas - enforces 30-minute increments and proper time comparison
const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

export const timeRangeSchema = z.object({
  start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM with zero-padded hours)"),
  end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM with zero-padded hours)"),
}).refine((range) => {
  const startMinutes = parseTimeToMinutes(range.start);
  const endMinutes = parseTimeToMinutes(range.end);
  return endMinutes > startMinutes;
}, {
  message: "End time must be after start time",
}).refine((range) => {
  const startMinutes = parseTimeToMinutes(range.start) % 30;
  const endMinutes = parseTimeToMinutes(range.end) % 30;
  return startMinutes === 0 && endMinutes === 0;
}, {
  message: "Times must be in 30-minute increments (e.g., 09:00, 09:30, 10:00)",
});

export const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  isOpen: z.boolean(),
  timeRanges: z.array(timeRangeSchema).optional(),
});

export const insertStylistAvailabilitySchema = createInsertSchema(stylistAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStylistAvailability = z.infer<typeof insertStylistAvailabilitySchema>;
export type StylistAvailability = typeof stylistAvailability.$inferSelect;
export type TimeRange = z.infer<typeof timeRangeSchema>;

// Legacy exports for compatibility with auth blueprint
export const users = stylists;
export const insertUserSchema = insertStylistSchema;
export type InsertUser = InsertStylist;
export type User = Stylist;
