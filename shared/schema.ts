import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar, json, jsonb, integer, serial, decimal, boolean, date, uniqueIndex, pgEnum, check, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for business types
export const businessTypeEnum = pgEnum("business_type", ["Hairstylist", "Barber", "Nail Technician"]);

// Default services by business type - shared between profile setup and business settings
export const DEFAULT_SERVICES_BY_TYPE = {
  Hairstylist: ["Women's Cut", "Blowout", "Color & Highlights", "Silk Press", "Deep Conditioning"],
  Barber: ["Men's Haircut", "Beard Trim", "Fade / Taper", "Line Up", "Hot Towel Shave"],
  "Nail Technician": ["Gel Manicure", "Acrylic Full Set", "Nail Art Design", "Dip Powder Nails", "Pedicure"],
} as const;

// Session table for authentication
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { mode: "date" }).notNull(),
});

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
  // Business Settings fields
  businessType: businessTypeEnum("business_type").default("Hairstylist"),
  smsSenderName: text("sms_sender_name"),
  defaultAppointmentDuration: integer("default_appointment_duration").default(30),
  preferredSlotFormat: integer("preferred_slot_format").default(30),
  showPublicly: boolean("show_publicly").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stylist Services table for individual services with pricing
export const stylistServices = pgTable("stylist_services", {
  id: serial("id").primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  serviceName: text("service_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationMinutes: integer("duration_minutes"), // Optional - fallback to stylists.defaultAppointmentDuration
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
  durationMinutes: z.number().int().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours").optional(),
  isCustom: z.boolean().default(false),
});

// Helper schema for form validation with number inputs
export const serviceFormSchema = z.object({
  serviceName: z.string().min(1, "Service name is required").max(100, "Service name must be 100 characters or less"),
  price: z.number().positive("Price must be greater than 0").max(9999.99, "Price must be less than $10,000"),
  durationMinutes: z.number().int().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours").optional(),
  isCustom: z.boolean().default(false),
});

export type InsertStylistService = z.infer<typeof insertStylistServiceSchema>;
export type StylistService = typeof stylistServices.$inferSelect;

// Phone number validation utility
export function validateAndNormalizePhone(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  // Remove all non-digit characters except +
  let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // If no + prefix, assume US number and add +1
  if (!cleanNumber.startsWith('+')) {
    // If it's 10 digits, assume US number
    if (cleanNumber.length === 10) {
      cleanNumber = '+1' + cleanNumber;
    } 
    // If it's 11 digits starting with 1, assume US number
    else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      cleanNumber = '+' + cleanNumber;
    }
    // If it's another length, try adding +1
    else if (cleanNumber.length > 6 && cleanNumber.length < 15) {
      cleanNumber = '+1' + cleanNumber;
    }
    else {
      return null; // Invalid length
    }
  }

  // Validate E.164 format (+ followed by 1-15 digits)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(cleanNumber)) {
    return null;
  }

  return cleanNumber;
}

// Phone number validation schema
export const phoneValidationSchema = z.string()
  .min(1, "Phone number is required")
  .transform((phone, ctx) => {
    const normalized = validateAndNormalizePhone(phone);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid phone number (e.g., +1234567890, 123-456-7890, or (123) 456-7890)",
      });
      return z.NEVER;
    }
    return normalized;
  });

// Business Hours validation schema
const businessHoursSchema = z.record(z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  isClosed: z.boolean().optional(),
}));

// Profile update schema for existing stylists
export const updateProfileSchema = z.object({
  phone: phoneValidationSchema,
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
  optInMarketing: boolean("opt_in_marketing").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Enhanced phone validation with E.164 format support
  phone: phoneValidationSchema.optional(),
  // Enhanced email validation
  email: z.string().email("Invalid email format").optional(),
  // Marketing opt-in preference
  optInMarketing: z.boolean().default(false),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Stylist Availability table for daily time ranges
export const stylistAvailability = pgTable("stylist_availability", {
  id: serial("id").primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  date: date("date").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
  timeRanges: jsonb("time_ranges").$type<{ start: string; end: string }[]>().notNull().default(sql`'[]'::jsonb`),
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

// Appointments table for tracking bookings
export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  serviceId: integer("service_id").notNull().references(() => stylistServices.id),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // Format: "HH:MM" (24-hour)
  endTime: text("end_time").notNull(), // Format: "HH:MM" (24-hour)
  status: text("status").notNull().default("scheduled"), // "scheduled", "completed", "cancelled", "no_show"
  notes: text("notes"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  stylistDateTimeUnique: uniqueIndex("appointments_u_stylist_date_time").on(table.stylistId, table.date, table.startTime),
}));

// Appointment validation schema
export const appointmentSchema = z.object({
  stylistId: z.string().uuid("Invalid stylist ID"),
  clientId: z.string().uuid("Invalid client ID"),
  serviceId: z.number().int().positive("Invalid service ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  notes: z.string().optional(),
  totalPrice: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Total price must be a valid positive number"),
}).refine((appointment) => {
  const startMinutes = parseTimeToMinutes(appointment.startTime);
  const endMinutes = parseTimeToMinutes(appointment.endTime);
  return endMinutes > startMinutes;
}, {
  message: "End time must be after start time",
}).refine((appointment) => {
  const startMinutes = parseTimeToMinutes(appointment.startTime);
  const endMinutes = parseTimeToMinutes(appointment.endTime);
  const durationMinutes = endMinutes - startMinutes;
  return durationMinutes >= 60; // Minimum 1 hour appointment
}, {
  message: "Appointment must be at least 1 hour long",
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Coupon type enum for database integrity
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "flat"]);

// Coupons table for promotional offers
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // Will change to enum after zero-drift
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  serviceId: integer("service_id").references(() => stylistServices.id), // Optional - can be null for general coupons
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}); // Removed constraints and indexes for zero-drift

// Frontend coupon form schema (includes duration helper)
export const couponFormSchema = z.object({
  name: z.string().min(1, "Coupon name is required").max(100, "Coupon name must be 100 characters or less"),
  type: z.enum(["percent", "flat"], { required_error: "Discount type is required" }),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 9999.99;
  }, "Amount must be a valid number between 0.01 and 9999.99"),
  serviceId: z.number().int().positive().optional(),
  duration: z.enum(["2weeks", "1month", "3months"], { required_error: "Duration is required" }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
}).refine((data) => {
  // Validate percentage range for percent type
  if (data.type === "percent") {
    const num = parseFloat(data.amount);
    return num >= 0 && num <= 100;
  }
  return true;
}, {
  message: "Percentage must be between 0 and 100",
  path: ["amount"]
});

// Unified coupon insertion schema with all validations
export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 9999.99;
  }, "Amount must be a valid number between 0.01 and 9999.99"),
}).superRefine((data, ctx) => {
  // Validate percentage range for percent type
  if (data.type === "percent") {
    const num = parseFloat(data.amount);
    if (num < 0 || num > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage must be between 0 and 100",
        path: ["amount"]
      });
    }
  }
  
  // Validate end date is after start date
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"]
      });
    }
  }
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

// Coupon deliveries table for tracking who coupons were sent to
export const couponDeliveries = pgTable("coupon_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id), // Will add cascade after zero-drift
  recipientType: text("recipient_type").notNull(), // 'all' | 'custom' | 'logic'
  clientIds: jsonb("client_ids").$type<string[]>().default(sql`'[]'::jsonb`), // Array of client IDs for custom targeting
  logicRule: text("logic_rule"), // 'first_time' | 'after_2_visits' for logic-based targeting
  message: text("message").notNull(), // Email content for delivery
  subject: text("subject").notNull(), // Email subject line
  // Email tracking fields
  emailStatus: text("email_status").default("pending"), // 'pending' | 'queued' | 'sent' | 'delivered' | 'failed'
  emailId: text("email_id"), // Resend email ID for tracking
  emailError: text("email_error"), // Error message if email delivery failed
  deliveredAt: timestamp("delivered_at"), // When email was successfully delivered
  scheduledAt: timestamp("scheduled_at").defaultNow(),  // Default to now for "send now" functionality
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}); // Removed indexes for zero-drift

// Enum for notification types
export const notificationTypeEnum = pgEnum("notification_type", ["thank_you", "follow_up", "rebook_prompt"]);

// Notifications table for follow-up emails
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  stylistId: uuid("stylist_id").notNull().references(() => stylists.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  type: notificationTypeEnum("type").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Frontend coupon delivery form schema
export const couponDeliveryFormSchema = z.object({
  couponId: z.string().uuid("Invalid coupon ID"),
  recipientType: z.enum(["all", "custom", "logic"], { required_error: "Recipient type is required" }),
  clientIds: z.array(z.string().uuid()).optional(),
  logicRule: z.enum(["first_time", "after_2_visits"]).optional(),
  messageTemplate: z.enum(["new_client", "general_promo", "loyalty_reward"]).optional(),
  message: z.string().min(1, "Message is required").max(5000, "Message too long for email (limit: 5000 characters)"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long (limit: 200 characters)"),
  scheduledAt: z.string().datetime("Invalid datetime format").optional(), // Optional for "send now"
}).refine((data) => {
  // Ensure clientIds is provided when recipientType is 'custom'
  if (data.recipientType === "custom" && (!data.clientIds || data.clientIds.length === 0)) {
    return false;
  }
  // Ensure logicRule is provided when recipientType is 'logic'
  if (data.recipientType === "logic" && !data.logicRule) {
    return false;
  }
  return true;
}, {
  message: "Custom targeting requires client IDs, logic targeting requires a rule",
});

export const insertCouponDeliverySchema = createInsertSchema(couponDeliveries).omit({
  id: true,
  createdAt: true,
  clientIds: true, // Handle separately for proper validation
}).extend({
  clientIds: z.array(z.string().uuid()).default([]),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long (limit: 200 characters)"),
}).superRefine((data, ctx) => {
  // Ensure clientIds is provided when recipientType is 'custom'
  if (data.recipientType === "custom" && (!data.clientIds || data.clientIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom targeting requires at least one client ID",
      path: ["clientIds"]
    });
  }
  // Ensure logicRule is provided when recipientType is 'logic'
  if (data.recipientType === "logic" && !data.logicRule) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Logic targeting requires a rule",
      path: ["logicRule"]
    });
  }
});

export type InsertCouponDelivery = z.infer<typeof insertCouponDeliverySchema>;
export type CouponDelivery = typeof couponDeliveries.$inferSelect;

// Notification schemas and types
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  status: true,
  errorMessage: true,
}).extend({
  type: z.enum(["thank_you", "follow_up", "rebook_prompt"], { required_error: "Notification type is required" }),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long (limit: 200 characters)"),
  message: z.string().min(1, "Message is required").max(5000, "Message too long (limit: 5000 characters)"),
});

// AI reminder scheduling schema for the /api/ai/schedule-reminder endpoint
export const scheduleReminderSchema = z.object({
  type: z.enum(["thank_you", "follow_up", "rebook_prompt"], { required_error: "Notification type is required" }),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long (limit: 200 characters)"),
  message: z.string().min(1, "Message is required").max(5000, "Message too long (limit: 5000 characters)"),
  daysAgo: z.number().int().min(1, "Days ago must be at least 1").max(365, "Days ago cannot exceed 365"),
  scheduledAt: z.string().datetime("Invalid datetime format").optional(), // Optional, defaults to immediate scheduling
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type ScheduleReminder = z.infer<typeof scheduleReminderSchema>;

// Helper functions for coupon management
export function calculateCouponEndDate(startDate: string, duration: "2weeks" | "1month" | "3months"): string {
  const start = new Date(startDate);
  let endDate: Date;
  
  switch (duration) {
    case "2weeks":
      endDate = new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
      break;
    case "1month":
      endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case "3months":
      endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + 3);
      break;
  }
  
  return endDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

export function isCouponActive(coupon: Coupon): boolean {
  const today = new Date().toISOString().split('T')[0];
  return today >= coupon.startDate && today <= coupon.endDate;
}

// Helper functions for slot management
export function generateHourlySlots(timeRanges: TimeRange[]): string[] {
  const slots: string[] = [];
  
  for (const range of timeRanges) {
    const startMinutes = parseTimeToMinutes(range.start);
    const endMinutes = parseTimeToMinutes(range.end);
    
    // Generate 1-hour slots from start to end
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  
  return slots.sort();
}

export function generate30MinuteSlots(timeRanges: TimeRange[]): string[] {
  const slots: string[] = [];
  
  for (const range of timeRanges) {
    const startMinutes = parseTimeToMinutes(range.start);
    const endMinutes = parseTimeToMinutes(range.end);
    
    // Generate 30-minute slots from start to end
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  
  return slots.sort();
}

export function filterAvailableSlots(allSlots: string[], bookedSlots: string[]): string[] {
  return allSlots.filter(slot => !bookedSlots.includes(slot));
}

export function getSlotEndTime(startTime: string, durationHours: number = 1): string {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = startMinutes + (durationHours * 60);
  const hours = Math.floor(endMinutes / 60);
  const mins = endMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Message templates for coupon delivery
export const MESSAGE_TEMPLATES = {
  new_client: "Hi! [BUSINESS_NAME] here. I'm excited to welcome you as a new client. Here's a special [DISCOUNT]% off your first visit. Use it before [EXPIRY_DATE]. Make sure to save and show this coupon code upon arrival. Reply STOP to opt out. Msg & data rates may apply.",
  general_promo: "Hi! [BUSINESS_NAME] here. I'm running a limited-time offer: [DISCOUNT]% off [SERVICE_NAME]. Book before [EXPIRY_DATE]. Make sure to save and show this coupon code upon arrival. Reply STOP to opt out. Msg & data rates may apply.",
  loyalty_reward: "Hi! [BUSINESS_NAME] here. Thanks for being a loyal client! You've earned [DISCOUNT]% off your next [SERVICE_NAME]. You can redeem it anytime before [EXPIRY_DATE]. See you soon! Make sure to save and show this coupon code upon arrival. Reply STOP to opt out. Msg & data rates may apply."
} as const;

export type MessageTemplateKey = keyof typeof MESSAGE_TEMPLATES;

export const MESSAGE_TEMPLATE_LABELS = {
  new_client: "New Client Promo",
  general_promo: "General Promo for All Clients", 
  loyalty_reward: "Loyalty Reward (After 2+ Visits)"
} as const;

// Helper function to replace placeholders in message templates
export function replaceMessagePlaceholders(
  template: string,
  coupon: Coupon,
  service?: { serviceName: string },
  stylist?: { firstName?: string | null; lastName?: string | null; email?: string } | null
): string {
  // Format the end date for display
  const endDate = new Date(coupon.endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });

  const serviceName = service ? service.serviceName : "All Services";
  const discount = coupon.type === "percent" ? Math.round(parseFloat(coupon.amount)) : `$${coupon.amount}`;
  
  // Create business name from stylist info or fallback
  const businessName = stylist 
    ? (stylist.firstName && stylist.lastName 
        ? `${stylist.firstName} ${stylist.lastName}` 
        : stylist.email?.split('@')[0] || "Your Stylist")
    : "Your Stylist";

  return template
    .replace(/\[DISCOUNT\]/g, discount.toString())
    .replace(/\[SERVICE_NAME\]/g, serviceName)
    .replace(/\[EXPIRY_DATE\]/g, endDate)
    .replace(/\[BUSINESS_NAME\]/g, businessName);
}

// Legacy exports for compatibility with auth blueprint
export const users = stylists;
export const insertUserSchema = insertStylistSchema;
export type InsertUser = InsertStylist;
export type User = Stylist;
