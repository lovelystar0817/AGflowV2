import { z } from "zod";

// AI Assistant Action Schemas
export const addClientSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const updateClientSchema = z.object({
  clientId: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const findClientSchema = z.object({
  query: z.string(),
});

export const bookAppointmentSchema = z.object({
  clientName: z.string(),
  serviceName: z.string(),
  date: z.string(),
  time: z.string(),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string(),
  date: z.string(),
  time: z.string(),
});

export const blockTimeSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const setBusinessHoursSchema = z.object({
  day: z.string(),
  open: z.string(),
  close: z.string(),
});

export const reminderSingleSchema = z.object({
  clientName: z.string(),
  when: z.string(),
});

export const remindersBulkNextDaySchema = z.object({});

export const createCouponSchema = z.object({
  name: z.string(),
  type: z.enum(["percent", "flat"]),
  amount: z.string(),
  serviceId: z.number().optional(),
  startDate: z.string(),
  duration: z.enum(["2weeks", "1month", "3months"]),
});

export const sendCouponSchema = z.object({
  couponId: z.string(),
  segment: z.object({
    inactiveWeeks: z.number().optional(),
    newClients: z.boolean().optional(),
  }).optional(),
  preview: z.boolean().optional(),
});

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