import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stylists = pgTable("stylists", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: text("business_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStylistSchema = createInsertSchema(stylists).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type InsertStylist = z.infer<typeof insertStylistSchema>;
export type Stylist = typeof stylists.$inferSelect;

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
