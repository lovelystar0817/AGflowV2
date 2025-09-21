import { z } from "zod";

import { phoneValidationSchema } from "./schema";

const trimmedString = (field: string, maxLength = 100) =>
  z
    .string({ required_error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(maxLength, `${field} must be at most ${maxLength} characters long`);

const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Invalid email format")
  .max(254, "Email must be at most 254 characters long");

const naturalLanguageDateTime = (field: string) =>
  z
    .string({ required_error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(150, `${field} must be at most 150 characters long`);

const validDayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const businessHourTimeSchema = z
  .string({ required_error: "Time is required" })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM 24-hour format");

const couponAmountSchema = z
  .string({ required_error: "Amount is required" })
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a number with up to two decimals")
  .refine((value) => parseFloat(value) > 0, "Amount must be greater than 0")
  .refine(
    (value) => parseFloat(value) <= 9999.99,
    "Amount must be less than or equal to 9999.99",
  );

const couponSegmentSchema = z
  .object({
    inactiveWeeks: z
      .number()
      .int("Inactive weeks must be a whole number")
      .min(1, "Inactive weeks must be at least 1")
      .max(52, "Inactive weeks cannot exceed 52")
      .optional(),
    newClients: z.boolean().optional(),
  })
  .strict()
  .refine(
    (segment) => segment.inactiveWeeks !== undefined || segment.newClients !== undefined,
    { message: "Segment must include at least one filter" },
  );

// AI Assistant Action Schemas
export const addClientSchema = z
  .object({
    name: trimmedString("Client name"),
    phone: phoneValidationSchema.optional(),
    email: emailSchema.optional(),
  })
  .strict();

export const updateClientSchema = z
  .object({
    clientId: z
      .string({ required_error: "Client ID is required" })
      .trim()
      .uuid("Client ID must be a valid UUID"),
    name: trimmedString("Client name").optional(),
    phone: phoneValidationSchema.optional(),
    email: emailSchema.optional(),
  })
  .strict()
  .refine((data) => data.name || data.phone || data.email, {
    message: "At least one field must be provided to update",
    path: ["name"],
  });

export const findClientSchema = z
  .object({
    query: trimmedString("Search query", 200),
  })
  .strict();

export const bookAppointmentSchema = z
  .object({
    clientName: trimmedString("Client name"),
    serviceName: trimmedString("Service name"),
    date: naturalLanguageDateTime("Date"),
    time: naturalLanguageDateTime("Time"),
  })
  .strict();

export const rescheduleAppointmentSchema = z
  .object({
    appointmentId: z
      .string({ required_error: "Appointment ID is required" })
      .trim()
      .uuid("Appointment ID must be a valid UUID"),
    date: naturalLanguageDateTime("Date"),
    time: naturalLanguageDateTime("Time"),
  })
  .strict();

export const blockTimeSchema = z
  .object({
    start: naturalLanguageDateTime("Start"),
    end: naturalLanguageDateTime("End"),
  })
  .strict()
  .refine((data) => data.start !== data.end, {
    message: "Start and end times must be different",
    path: ["end"],
  });

export const setBusinessHoursSchema = z
  .object({
    day: z
      .string({ required_error: "Day is required" })
      .trim()
      .min(1, "Day is required")
      .max(15, "Day must be at most 15 characters long")
      .refine((value) => validDayNames.includes(value.toLowerCase() as (typeof validDayNames)[number]), {
        message: "Day must be a valid day of the week",
      }),
    open: businessHourTimeSchema,
    close: businessHourTimeSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const [openHour, openMinute] = data.open.split(":").map(Number);
    const [closeHour, closeMinute] = data.close.split(":").map(Number);
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (closeMinutes <= openMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Closing time must be after opening time",
        path: ["close"],
      });
    }
  });

export const reminderSingleSchema = z
  .object({
    clientName: trimmedString("Client name"),
    when: naturalLanguageDateTime("Reminder time"),
  })
  .strict();

export const remindersBulkNextDaySchema = z.object({}).strict();

export const createCouponSchema = z
  .object({
    name: trimmedString("Coupon name", 120),
    type: z.enum(["percent", "flat"], { required_error: "Coupon type is required" }),
    amount: couponAmountSchema,
    serviceId: z
      .number({ invalid_type_error: "Service ID must be a number" })
      .int("Service ID must be an integer")
      .positive("Service ID must be a positive integer")
      .optional(),
    startDate: naturalLanguageDateTime("Start date"),
    duration: z.enum(["2weeks", "1month", "3months"], {
      required_error: "Duration is required",
    }),
  })
  .strict()
  .superRefine((data, ctx) => {
    const amountValue = parseFloat(data.amount);

    if (Number.isNaN(amountValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be a valid number",
        path: ["amount"],
      });
      return;
    }

    if (data.type === "percent" && (amountValue <= 0 || amountValue > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage discounts must be between 0 and 100",
        path: ["amount"],
      });
    }
  });

export const sendCouponSchema = z
  .object({
    couponId: z
      .string({ required_error: "Coupon ID is required" })
      .trim()
      .uuid("Coupon ID must be a valid UUID"),
    segment: couponSegmentSchema.optional(),
    preview: z.boolean().optional(),
  })
  .strict();

export const ActionSchemas = {
  addClient: addClientSchema,
  updateClient: updateClientSchema,
  findClient: findClientSchema,
  bookAppointment: bookAppointmentSchema,
  rescheduleAppointment: rescheduleAppointmentSchema,
  blockTime: blockTimeSchema,
  setBusinessHours: setBusinessHoursSchema,
  reminderSingle: reminderSingleSchema,
  remindersBulkNextDay: remindersBulkNextDaySchema,
  createCoupon: createCouponSchema,
  sendCoupon: sendCouponSchema,
} as const;

export type ActionName = keyof typeof ActionSchemas;