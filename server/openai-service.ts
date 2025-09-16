import OpenAI from "openai";
import { z } from "zod";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// CRITICAL SECURITY: Robust schema validation for OpenAI responses
const aiActionResponseSchema = z.object({
  action: z.enum(["send_coupon", "add_client", "unknown"]),
  weeksInactive: z.number().int().min(1).max(52).optional(),
  amount: z.number().positive().max(10000).optional(),
  deliveryMethod: z.enum(["email"]).optional(),
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  error: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === "send_coupon") {
      return data.weeksInactive !== undefined && data.amount !== undefined && data.deliveryMethod !== undefined;
    }
    if (data.action === "add_client") {
      return data.name !== undefined && data.phone !== undefined && data.email !== undefined;
    }
    return true;
  },
  {
    message: "send_coupon action requires weeksInactive, amount, and deliveryMethod; add_client action requires name, phone, and email",
  }
);

const dateValidationSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
  .refine((date) => {
    const parsedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedDate >= today;
  }, "Date cannot be in the past");

const timeValidationSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)");

const daysValidationSchema = z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]));

const aiSchedulingResponseSchema = z.object({
  action: z.enum(["book_appointment", "reschedule_appointment", "block_time", "set_hours", "unknown"]),
  clientName: z.string().min(1).max(100).optional(),
  serviceName: z.string().min(1).max(100).optional(),
  date: dateValidationSchema.optional(),
  time: timeValidationSchema.optional(),
  existingAppointmentId: z.string().uuid().optional(),
  startTime: timeValidationSchema.optional(),
  endTime: timeValidationSchema.optional(),
  days: daysValidationSchema.optional(),
  error: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === "book_appointment") {
      return data.clientName && data.date && data.time;
    }
    if (data.action === "reschedule_appointment") {
      return data.clientName && data.date && data.time;
    }
    if (data.action === "block_time") {
      return data.date && data.startTime && data.endTime;
    }
    if (data.action === "set_hours") {
      return data.days && data.days.length > 0 && data.startTime && data.endTime;
    }
    return true;
  },
  {
    message: "Required fields missing for the specified action",
  }
).refine(
  (data) => {
    // Validate that start time is before end time
    if (data.startTime && data.endTime) {
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return startMinutes < endMinutes;
    }
    return true;
  },
  {
    message: "Start time must be before end time",
  }
);

export interface AIActionResponse {
  action: string;
  weeksInactive?: number;
  amount?: number;
  deliveryMethod?: string;
  name?: string;
  phone?: string;
  email?: string;
  error?: string;
}

export interface AISchedulingResponse {
  action: 'book_appointment' | 'reschedule_appointment' | 'block_time' | 'set_hours' | 'unknown';
  clientName?: string;
  serviceName?: string;
  date?: string; // YYYY-MM-DD format
  time?: string; // HH:MM format
  existingAppointmentId?: string;
  startTime?: string; // For blocking time or setting hours
  endTime?: string; // For blocking time or setting hours
  days?: string[]; // For setting hours (e.g., ['monday', 'tuesday'])
  error?: string;
}

export async function parseAICommand(command: string, stylistInfo: any): Promise<AIActionResponse> {
  try {
    const systemPrompt = `You are an AI salon assistant for a hair stylist, barber, or nail stylist.
Your job is to turn stylist commands into API actions.
You must respond with a JSON object describing what to do.

Available actions:
- "send_coupon": Send a coupon to clients
- "add_client": Add a new client to the database
- "unknown": For commands you can't understand

For send_coupon actions, include:
- weeksInactive: number (how many weeks since last visit, default 4, must be 1-52)
- amount: number (dollar amount for coupon, must be positive, max $10,000)
- deliveryMethod: "email" (always email for now)

For add_client actions, include:
- name: string (full name, required, max 200 chars)
- phone: string (phone number, required, max 50 chars)
- email: string (valid email address, required)

Examples:
Input: "Send $25 coupon to inactive clients"
Output: {"action": "send_coupon", "weeksInactive": 4, "amount": 25, "deliveryMethod": "email"}

Input: "Send $20 off to clients who haven't been here in 6 weeks"
Output: {"action": "send_coupon", "weeksInactive": 6, "amount": 20, "deliveryMethod": "email"}

Input: "Add client Sarah Smith with phone 803-555-1234 and email sarah@example.com"
Output: {"action": "add_client", "name": "Sarah Smith", "phone": "803-555-1234", "email": "sarah@example.com"}

Input: "Create new client John Doe, phone: (555) 123-4567, email john@email.com"
Output: {"action": "add_client", "name": "John Doe", "phone": "(555) 123-4567", "email": "john@email.com"}

Input: "What's the weather like?"
Output: {"action": "unknown", "error": "I can only help with salon business tasks like sending coupons to clients or adding clients"}

Business Context:
- Business Name: ${stylistInfo.businessName || "Your Salon"}
- Business Type: ${stylistInfo.businessType || "Salon"}
- Default appointment duration: ${stylistInfo.defaultAppointmentDuration || 30} minutes

Respond only with valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: command }
      ],
      response_format: { type: "json_object" },
      temperature: 0, // Deterministic parsing for client data extraction
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // CRITICAL SECURITY: Parse and validate response with Zod schema
    let rawResponse;
    try {
      rawResponse = JSON.parse(content);
    } catch (parseError) {
      throw new Error("Invalid JSON response from AI");
    }

    // Validate with Zod schema
    const validationResult = aiActionResponseSchema.safeParse(rawResponse);
    
    if (!validationResult.success) {
      console.error("AI response validation failed:", validationResult.error.errors);
      return {
        action: "unknown",
        error: `Invalid AI response: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      };
    }

    return validationResult.data;
  } catch (error) {
    console.error("Error parsing AI command:", error);
    return {
      action: "unknown",
      error: error instanceof Error ? error.message : "Failed to parse command"
    };
  }
}

export async function parseSchedulingCommand(command: string, stylistInfo: any): Promise<AISchedulingResponse> {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const systemPrompt = `You are an AI scheduling assistant for a hair stylist business.
Your job is to parse natural language scheduling commands into structured actions.
You must respond with a JSON object describing what to do.

Current date: ${currentDate} (${currentDay})

Available actions:
- "book_appointment": Book a new appointment for a client
- "reschedule_appointment": Reschedule an existing appointment
- "block_time": Block off time periods (unavailable for booking)
- "set_hours": Set working hours for specific days
- "unknown": For commands you can't understand

For book_appointment actions, include:
- clientName: string (first name, last name, or full name, 1-100 chars)
- serviceName: string (haircut, color, manicure, etc., 1-100 chars)
- date: string (YYYY-MM-DD format, interpret relative dates, must be today or future)
- time: string (HH:MM format in 24-hour time)

For reschedule_appointment actions, include:
- clientName: string (to identify the appointment, 1-100 chars)
- date: string (YYYY-MM-DD format, must be today or future)
- time: string (HH:MM format)
- existingAppointmentId: string (if known from context, UUID format)

For block_time actions, include:
- date: string (YYYY-MM-DD format, must be today or future)
- startTime: string (HH:MM format)
- endTime: string (HH:MM format, must be after startTime)

For set_hours actions, include:
- days: string[] (array of day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday)
- startTime: string (HH:MM format)
- endTime: string (HH:MM format, must be after startTime)

Date parsing rules:
- "Friday" = next Friday from current date
- "next Monday" = Monday of next week
- "tomorrow" = current date + 1 day
- "today" = current date
- Always output dates in YYYY-MM-DD format
- Dates must be today or in the future

Time parsing rules:
- Convert to 24-hour format (2pm = 14:00, 10am = 10:00)
- Default to :00 minutes if not specified
- Use 30-minute increments when possible
- Validate HH:MM format (00:00-23:59)

Examples:
Input: "Book Ashley for a haircut at 2pm on Friday"
Output: {"action": "book_appointment", "clientName": "Ashley", "serviceName": "haircut", "date": "2025-09-20", "time": "14:00"}

Input: "Reschedule Sarah to Tuesday at 10am"
Output: {"action": "reschedule_appointment", "clientName": "Sarah", "date": "2025-09-17", "time": "10:00"}

Input: "Block off next Monday morning"
Output: {"action": "block_time", "date": "2025-09-22", "startTime": "09:00", "endTime": "12:00"}

Input: "Set my hours next week from 10am–4pm"
Output: {"action": "set_hours", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "startTime": "10:00", "endTime": "16:00"}

Business Context:
- Business Name: ${stylistInfo.businessName || "Your Salon"}
- Default appointment duration: ${stylistInfo.defaultAppointmentDuration || 30} minutes
- Typical business hours: 9am-6pm

Respond only with valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: command }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // CRITICAL SECURITY: Parse and validate response with Zod schema
    let rawResponse;
    try {
      rawResponse = JSON.parse(content);
    } catch (parseError) {
      throw new Error("Invalid JSON response from AI");
    }

    // Validate with Zod schema
    const validationResult = aiSchedulingResponseSchema.safeParse(rawResponse);
    
    if (!validationResult.success) {
      console.error("AI scheduling response validation failed:", validationResult.error.errors);
      return {
        action: "unknown",
        error: `Invalid AI response: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      };
    }

    return validationResult.data;
  } catch (error) {
    console.error("Error parsing scheduling command:", error);
    return {
      action: "unknown",
      error: error instanceof Error ? error.message : "Failed to parse scheduling command"
    };
  }
}