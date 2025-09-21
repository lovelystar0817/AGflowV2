import OpenAI from "openai";
import { z } from "zod";
import { env } from "./db";
import { ActionSchemas, type ActionName } from "@shared/ai-actions";
import { parseDate, parseTime, parsePhone, isValidEmail } from "./parsers";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Budget tracking stub - persist later
let budgetUsed = 0;

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
      response_format: { type: "json_object" }
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

// ============== NEW ROUTER PROMPT FUNCTIONALITY ==============

interface RoutePromptInput {
  prompt: string;
  stylistId: string; // Enforced from session, never from model/user
}

interface RouteResponse {
  status: "needs_clarification" | "confirm" | "error";
  question?: string;
  partialArgs?: any;
  action?: ActionName;
  args?: any;
  summary?: string;
  message?: string;
}

/**
 * Routes a natural language prompt to an AI action
 * Enforces tenant scoping through stylistId parameter
 */
export async function routePrompt({ prompt, stylistId }: RoutePromptInput): Promise<RouteResponse> {
  // Validate required inputs
  if (!prompt || !stylistId) {
    return {
      status: "error",
      message: "Missing required prompt or stylist context"
    };
  }

  try {
    // Try cheap/fast model first (gpt-5 for initial routing)
    const result = await routeWithModel(prompt, stylistId, "fast");
    
    // If ambiguous, escalate to better reasoning (same model but more detailed prompt)
    if (result.status === "needs_clarification" && !result.question) {
      return await routeWithModel(prompt, stylistId, "detailed");
    }
    
    return result;
  } catch (error) {
    console.error('OpenAI service error:', error);
    return {
      status: "error",
      message: "Failed to process request. Please try again."
    };
  }
}

/**
 * Route prompt using specified model tier
 */
async function routeWithModel(prompt: string, stylistId: string, tier: "fast" | "detailed"): Promise<RouteResponse> {
  budgetUsed++; // Budget tracking stub
  
  const systemPrompt = tier === "fast" ? getFastSystemPrompt() : getDetailedSystemPrompt();
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and normalize the response
    return await validateAndNormalizeResponse(result, stylistId);
    
  } catch (error) {
    console.error(`Model tier ${tier} failed:`, error);
    return {
      status: "error",
      message: "Unable to understand request. Please rephrase."
    };
  }
}

/**
 * Fast system prompt for initial routing
 */
function getFastSystemPrompt(): string {
  return `You are a salon management AI assistant. Parse user requests into structured actions.

Available actions:
- addClient: Add new client {name, phone?, email?}
- updateClient: Update client {clientId, name?, phone?, email?}  
- findClient: Search clients {query}
- bookAppointment: Book appointment {clientName, serviceName, date, time}
- rescheduleAppointment: Reschedule {appointmentId, date, time}
- blockTime: Block time slot {start, end}
- setBusinessHours: Set hours {day, open, close}
- reminderSingle: Send reminder {clientName, when, channel: "sms"|"email"}
- remindersBulkNextDay: Bulk reminders {channel: "sms"|"email"}
- createCoupon: Create coupon {name, type: "percent"|"flat", amount, serviceId?, startDate, duration: "2weeks"|"1month"|"3months"}
- sendCoupon: Send coupon {couponId, segment?, preview?}

Respond in JSON format:
{
  "action": "actionName",
  "args": {...},
  "confidence": 0.8,
  "missing": ["field1"] // if info missing
}

If information is clearly missing, include "missing" array with required fields.`;
}

/**
 * Detailed system prompt for complex parsing
 */
function getDetailedSystemPrompt(): string {
  return `You are an expert salon management AI assistant. Carefully analyze user requests and extract structured actions.

${getFastSystemPrompt()}

Additional guidelines:
- Parse natural dates like "tomorrow", "next Friday" 
- Handle phone numbers in various formats
- Validate email addresses
- If ambiguous, ask ONE specific clarifying question
- Always specify confidence level (0.0-1.0)
- For missing required info, provide helpful question in "clarification" field

Example responses:
{
  "action": "bookAppointment", 
  "args": {"clientName": "John", "serviceName": "haircut", "date": "2025-09-22", "time": "15:00"},
  "confidence": 0.9
}

{
  "clarification": "What time would you like to schedule the appointment?",
  "action": "bookAppointment",
  "partialArgs": {"clientName": "Sarah", "serviceName": "color"}
}`;
}

/**
 * Validate response against schemas and normalize arguments
 */
async function validateAndNormalizeResponse(result: any, stylistId: string): Promise<RouteResponse> {
  // Handle clarification requests
  if (result.clarification) {
    return {
      status: "needs_clarification",
      question: result.clarification,
      partialArgs: result.partialArgs || {}
    };
  }

  // Handle missing information
  if (result.missing && result.missing.length > 0) {
    const missingField = result.missing[0]; // Take first missing field
    const question = generateClarificationQuestion(result.action, missingField);
    return {
      status: "needs_clarification",
      question,
      partialArgs: result.args || {}
    };
  }

  // Validate action exists
  const action = result.action as ActionName;
  if (!action || !ActionSchemas[action]) {
    return {
      status: "error",
      message: "Unknown action requested"
    };
  }

  // Validate and normalize arguments
  try {
    const schema = ActionSchemas[action];
    const rawArgs = result.args || {};
    
    // Normalize arguments using parsers
    const normalizedArgs = await normalizeArguments(rawArgs, action);
    
    // Validate with schema
    const validatedArgs = schema.parse(normalizedArgs);
    
    // Generate summary
    const summary = generateActionSummary(action, validatedArgs);
    
    return {
      status: "confirm",
      action,
      args: validatedArgs,
      summary
    };
    
  } catch (validationError) {
    console.error('Validation error:', validationError);
    
    // Generate single clarifying question for validation failure
    const question = generateValidationQuestion(action, validationError);
    return {
      status: "needs_clarification",
      question,
      partialArgs: result.args || {}
    };
  }
}

/**
 * Normalize arguments using parser functions
 */
async function normalizeArguments(args: any, action: ActionName): Promise<any> {
  const normalized = { ...args };
  
  // Normalize dates
  if (normalized.date && typeof normalized.date === 'string') {
    normalized.date = parseDate(normalized.date).split('T')[0]; // Extract date part
  }
  if (normalized.startDate && typeof normalized.startDate === 'string') {
    normalized.startDate = parseDate(normalized.startDate).split('T')[0];
  }
  
  // Normalize times
  if (normalized.time && normalized.date) {
    normalized.time = parseTime(normalized.time, normalized.date);
  }
  if (normalized.start && typeof normalized.start === 'string') {
    normalized.start = parseDate(normalized.start);
  }
  if (normalized.end && typeof normalized.end === 'string') {
    normalized.end = parseDate(normalized.end);
  }
  
  // Normalize phone numbers
  if (normalized.phone && typeof normalized.phone === 'string') {
    const parsedPhone = parsePhone(normalized.phone);
    if (parsedPhone) {
      normalized.phone = parsedPhone;
    }
  }
  
  // Validate emails
  if (normalized.email && typeof normalized.email === 'string') {
    if (!isValidEmail(normalized.email)) {
      throw new Error(`Invalid email format: ${normalized.email}`);
    }
  }
  
  return normalized;
}

/**
 * Generate clarification question for missing fields
 */
function generateClarificationQuestion(action: ActionName, missingField: string): string {
  const questions: Record<string, Record<string, string>> = {
    bookAppointment: {
      clientName: "What's the client's name for the appointment?",
      serviceName: "Which service would you like to book?",
      date: "What date would you like to schedule the appointment?",
      time: "What time works best for the appointment?"
    },
    addClient: {
      name: "What's the client's name?"
    },
    updateClient: {
      clientId: "Which client would you like to update?"
    },
    reminderSingle: {
      clientName: "Which client should receive the reminder?",
      when: "When should the reminder be sent?",
      channel: "Should the reminder be sent via SMS or email?"
    },
    createCoupon: {
      name: "What should the coupon be called?",
      type: "Should the coupon be a percentage or flat amount discount?",
      amount: "What's the discount amount?",
      startDate: "When should the coupon become active?",
      duration: "How long should the coupon be valid? (2 weeks, 1 month, or 3 months)"
    }
  };
  
  return questions[action]?.[missingField] || `Please provide the ${missingField} for this ${action} request.`;
}

/**
 * Generate clarification question for validation errors
 */
function generateValidationQuestion(action: ActionName, error: any): string {
  const message = error.message || error.toString();
  
  if (message.includes('email')) {
    return "Please provide a valid email address (e.g., client@example.com).";
  }
  if (message.includes('phone')) {
    return "Please provide a valid phone number with area code.";
  }
  if (message.includes('date')) {
    return "Please specify a valid date (e.g., 'tomorrow', 'next Friday', or '2025-12-25').";
  }
  if (message.includes('time')) {
    return "Please specify a valid time (e.g., '3pm', '15:30', or '2:30 PM').";
  }
  
  return `Please provide valid information for your ${action} request.`;
}

/**
 * Generate user-friendly summary of action
 */
function generateActionSummary(action: ActionName, args: any): string {
  const summaries: Record<ActionName, (args: any) => string> = {
    addClient: (a) => `Add new client "${a.name}"${a.phone ? ` (${a.phone})` : ''}${a.email ? ` (${a.email})` : ''}`,
    updateClient: (a) => `Update client information${a.name ? ` - name: ${a.name}` : ''}${a.phone ? ` - phone: ${a.phone}` : ''}${a.email ? ` - email: ${a.email}` : ''}`,
    findClient: (a) => `Search for clients matching "${a.query}"`,
    bookAppointment: (a) => `Book ${a.serviceName} appointment for ${a.clientName} on ${a.date} at ${new Date(a.time).toLocaleTimeString()}`,
    rescheduleAppointment: (a) => `Reschedule appointment to ${a.date} at ${new Date(a.time).toLocaleTimeString()}`,
    blockTime: (a) => `Block time from ${new Date(a.start).toLocaleString()} to ${new Date(a.end).toLocaleString()}`,
    setBusinessHours: (a) => `Set ${a.day} hours: ${a.open} - ${a.close}`,
    reminderSingle: (a) => `Send ${a.channel} reminder to ${a.clientName} ${a.when}`,
    remindersBulkNextDay: (a) => `Send ${a.channel} reminders to all clients for tomorrow's appointments`,
    createCoupon: (a) => `Create "${a.name}" coupon: ${a.amount}${a.type === 'percent' ? '%' : '$'} off, valid for ${a.duration}`,
    sendCoupon: (a) => `Send coupon${a.preview ? ' preview' : ''}${a.segment ? ' to targeted segment' : ' to all clients'}`
  };
  
  return summaries[action]?.(args) || `Execute ${action} with provided parameters`;
}

// Export budget tracking for monitoring
export function getBudgetUsed(): number {
  return budgetUsed;
}

export function resetBudget(): void {
  budgetUsed = 0;
}

// ============== EXISTING LEGACY FUNCTIONS ==============

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
      model: "gpt-5",
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