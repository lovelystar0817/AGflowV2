import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { postLimiter } from "./index";
import csrf from "csrf";
import { storage } from "./storage-instance";
import { type PaginationParams, type PaginatedResponse } from "./storage";
import { insertClientSchema, updateProfileSchema, serviceFormSchema, availabilitySchema, insertAppointmentSchema, insertCouponSchema, couponFormSchema, insertCouponDeliverySchema, insertNotificationSchema, scheduleReminderSchema, getSlotEndTime, coupons, type Client, type InsertStylistService, type Appointment, type Coupon, type CouponDelivery, type InsertCouponDelivery, calculateCouponEndDate } from "@shared/schema";
import { z } from "zod";
import { parseAICommand, parseSchedulingCommand } from "./openai-service";
import { findBestClientMatch, findBestServiceMatch, checkAppointmentConflicts, checkAvailability, calculateEndTime, isWithinBusinessHours } from "./scheduling-utils";
import { getNotificationJobService } from "./notification-job";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize CSRF protection
  const tokens = new csrf();

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // CRITICAL SECURITY: Rate limiting for AI endpoints to prevent abuse and cost exposure
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 AI requests per minute
    message: "Too many AI requests, please try again later. AI operations are limited to prevent abuse.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Rate limit by both IP and user ID for authenticated users
      // Use proper IPv6-safe IP key generation
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const baseKey = ipKeyGenerator(ip);
      return req.user ? `${baseKey}-${req.user.id}` : baseKey;
    },
  });

  // Apply rate limiting to auth routes
  app.use("/api/register", authLimiter);
  app.use("/api/login", authLimiter);

  // Apply AI rate limiting to AI endpoints
  app.use("/api/ai/book-appointment", aiLimiter);
  app.use("/api/ai/update-availability", aiLimiter);
  app.use("/api/ai/execute", aiLimiter);

  // Setup authentication routes
  setupAuth(app);

  // CSRF token endpoint (after sessions are set up, before CSRF middleware)
  app.get('/api/csrf', (req: Request & { session?: any }, res: Response) => {
    // Ensure session exists
    if (!req.session) {
      return res.status(500).json({ error: 'Session not available' });
    }

    // Generate or reuse CSRF secret
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = tokens.secretSync();
    }

    // Generate token
    const token = tokens.create(req.session.csrfSecret);
    res.json({ csrfToken: token });
  });

  // CSRF protection middleware (protects ALL routes including auth)
  app.use((req: Request & { session?: any }, res: Response, next: NextFunction) => {
    // Skip CSRF check for GET, HEAD, OPTIONS requests and the /api/csrf endpoint itself
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/api/csrf') {
      return next();
    }

    // Check for CSRF token in header or body
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!token) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }

    // Validate CSRF token
    const secret = req.session?.csrfSecret;
    if (!secret || !tokens.verify(secret, token as string)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
  });

  // Apply POST rate limiter to authenticated POST routes
  // This runs after authentication so req.user is available
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.path.startsWith('/api/') && !req.path.startsWith('/api/public/')) {
      return postLimiter(req, res, next);
    }
    next();
  });

  // Client management routes
  app.get("/api/clients", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const q = req.query.q as string | undefined;

      const paginationParams: PaginationParams = {
        page,
        pageSize,
        q
      };

      const result = await storage.getClientsByStylistPaginated(req.user.id, paginationParams);
      res.json(result);
    } catch (error) {
      next(error); // Pass error to error handler middleware
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Check if client belongs to the authenticated stylist
      if (client.stylistId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const validation = insertClientSchema.safeParse({
        ...req.body,
        stylistId: req.user.id,
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }
      
      const client = await storage.createClient(validation.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Check if client belongs to the authenticated stylist
      if (client.stylistId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updateSchema = insertClientSchema.partial().omit({ stylistId: true });
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }
      
      const updatedClient = await storage.updateClient(req.params.id, validation.data);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Check if client belongs to the authenticated stylist
      if (client.stylistId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Services management routes
  app.get("/api/services", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const q = req.query.q as string | undefined;

      const paginationParams: PaginationParams = {
        page,
        pageSize,
        q
      };

      const result = await storage.getStylistServicesPaginated(req.user.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const validation = serviceFormSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }

      const serviceData: InsertStylistService = {
        stylistId: req.user.id,
        serviceName: validation.data.serviceName,
        price: validation.data.price.toString(),
        isCustom: validation.data.isCustom,
      };
      
      const newService = await storage.createStylistService(serviceData);
      res.status(201).json(newService);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Invalid service ID" });
      }

      const validation = serviceFormSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }

      const updates = {
        serviceName: validation.data.serviceName,
        price: validation.data.price.toString(),
        isCustom: validation.data.isCustom,
      };
      
      const updatedService = await storage.updateStylistService(serviceId, updates);
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Invalid service ID" });
      }
      
      await storage.deleteStylistService(serviceId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Availability management routes
  app.get("/api/availability/:date", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.params;
      
      // Validate date format
      const dateValidation = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").safeParse(date);
      if (!dateValidation.success) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const availability = await storage.getStylistAvailability(req.user.id, date);
      
      // Return default availability if none exists
      if (!availability) {
        return res.json({
          date,
          isOpen: true,
          timeRanges: [],
        });
      }
      
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/availability/:date", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.params;
      
      const validation = availabilitySchema.safeParse({
        ...req.body,
        date,
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid availability data", details: validation.error.errors });
      }
      
      const availabilityData = {
        stylistId: req.user.id,
        date: validation.data.date,
        isOpen: validation.data.isOpen,
        timeRanges: validation.data.timeRanges || [],
      };
      
      const availability = await storage.setStylistAvailability(availabilityData);
      res.json(availability);
    } catch (error) {
      console.error("Error setting availability:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/availability/:date", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.params;
      
      // Validate date format
      const dateValidation = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").safeParse(date);
      if (!dateValidation.success) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const updateSchema = availabilitySchema.omit({ date: true }).partial();
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid availability data", details: validation.error.errors });
      }
      
      const updatedAvailability = await storage.updateStylistAvailability(req.user.id, date, validation.data);
      res.json(updatedAvailability);
    } catch (error) {
      console.error("Error updating availability:", error);
      if (error instanceof Error && error.message.includes("No availability found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Profile management route
  app.patch("/api/profile", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const validation = updateProfileSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid profile data", details: validation.error.errors });
      }
      
      const updatedStylist = await storage.updateStylistProfile(req.user.id, validation.data);
      
      // Remove passwordHash from response for security
      const { passwordHash, ...stylistResponse } = updatedStylist;
      
      res.json(stylistResponse);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Business settings routes
  app.put("/api/business-settings", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const businessSettingsSchema = z.object({
        businessName: z.string().min(1, "Business name is required").optional(),
        businessType: z.enum(["Hairstylist", "Barber", "Nail Technician"]).optional(),
        bio: z.string().optional(),
        location: z.string().optional(),
        smsSenderName: z.string().min(1, "SMS sender name is required").max(11, "SMS sender name must be 11 characters or less").optional(),
        defaultAppointmentDuration: z.number().int().min(15).max(180).optional(),
        preferredSlotFormat: z.number().int().min(15).max(120).optional(),
        showPublicly: z.boolean().optional(),
      });
      
      const validation = businessSettingsSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid business settings data", details: validation.error.errors });
      }
      
      const updatedStylist = await storage.updateBusinessSettings(req.user.id, validation.data);
      
      // Remove passwordHash from response for security
      const { passwordHash, ...stylistResponse } = updatedStylist;
      
      res.json(stylistResponse);
    } catch (error) {
      console.error("Error updating business settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/services/replace", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const replaceServicesSchema = z.object({
        services: z.array(z.string()).min(1, "At least one service is required"),
      });
      
      const validation = replaceServicesSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid services data", details: validation.error.errors });
      }
      
      // Replace services using existing storage method
      const newServices = validation.data.services.map(serviceName => ({
        serviceName,
        price: "50.00", // Default price
        isCustom: false,
      }));
      
      const createdServices = await storage.replaceStylistServices(req.user.id, newServices);
      
      res.json({ 
        message: "Services replaced successfully",
        services: createdServices 
      });
    } catch (error) {
      console.error("Error replacing services:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Appointment booking routes
  app.get("/api/appointments", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.query;
      
      // Validate date format if provided
      if (date && typeof date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const q = req.query.q as string | undefined;

      const paginationParams: PaginationParams = {
        page,
        pageSize,
        q
      };

      const result = await storage.getAppointmentsByStylistPaginated(
        req.user.id, 
        paginationParams,
        date && typeof date === "string" ? date : undefined
      );
      res.json(result);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/appointments/details", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.query;
      
      // Validate date format if provided
      if (date && typeof date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const appointments = await storage.getAppointmentsWithDetails(
        req.user.id, 
        date && typeof date === "string" ? date : undefined
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments with details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Today's appointments route
  app.get("/api/appointments/today", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const appointments = await storage.getAppointmentsWithDetails(req.user.id, today);
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update appointment status route
  app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { id } = req.params;
      const statusSchema = z.object({
        status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
      });
      
      const validation = statusSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }
      
      // First check if the appointment exists and belongs to this stylist
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      if (appointment.stylistId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedAppointment = await storage.updateAppointment(id, { status: validation.data.status });
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const validation = insertAppointmentSchema.safeParse({
        ...req.body,
        stylistId: req.user.id,
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }
      
      const { date, startTime, clientId, serviceId, notes } = validation.data;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      // Verify client belongs to the stylist
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (client.stylistId !== req.user.id) {
        return res.status(403).json({ error: "Client does not belong to this stylist" });
      }
      
      // Verify service belongs to the stylist
      const services = await storage.getStylistServices(req.user.id);
      const service = services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      // Check slot availability
      const availableSlots = await storage.getAvailableSlots(req.user.id, date);
      const isSlotAvailable = availableSlots.includes(startTime);
      
      if (!isSlotAvailable) {
        return res.status(409).json({ error: "Time slot is no longer available" });
      }
      
      // Create appointment with server-enforced values
      const appointmentData = {
        stylistId: req.user.id,
        clientId,
        serviceId,
        date,
        startTime,
        endTime: getSlotEndTime(startTime), // Enforce 1-hour duration
        status: "confirmed" as const, // Force confirmed status
        notes: notes || undefined,
        totalPrice: service.price.toString(), // Use service price, not client input
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      
      // Handle unique constraint violation (PostgreSQL error code 23505)
      if ((error as any).code === '23505') {
        return res.status(409).json({ error: "Time slot is no longer available" });
      }
      
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Check if appointment belongs to the authenticated stylist
      if (appointment.stylistId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/available-slots/:date", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.params;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const availableSlots = await storage.getAvailableSlots(req.user.id, date);
      res.json(availableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/slots-count/:date", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { date } = req.params;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const slotCounts = await storage.getSlotsCount(req.user.id, date);
      res.json(slotCounts);
    } catch (error) {
      console.error("Error fetching slot counts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coupon management routes
  app.get("/api/coupons", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const q = req.query.q as string | undefined;

      const paginationParams: PaginationParams = {
        page,
        pageSize,
        q
      };

      const result = await storage.getCouponsByStylistPaginated(req.user.id, paginationParams);
      res.json(result);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/coupons/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const coupon = await storage.getCoupon(req.params.id, req.user.id);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      
      res.json(coupon);
    } catch (error) {
      console.error("Error fetching coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/coupons", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertCouponSchema.safeParse({
        ...req.body,
        stylistId: req.user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }

      const coupon = await storage.createCoupon(validation.data);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/coupons/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Create update schema based on insertCouponSchema but make fields optional
      const updateCouponSchema = insertCouponSchema.omit({ stylistId: true }).partial().extend({
        duration: z.enum(["2weeks", "1month", "3months"]).optional(),
      });

      const validation = updateCouponSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }

      // Check if coupon exists and belongs to user
      const existingCoupon = await storage.getCoupon(req.params.id, req.user.id);
      if (!existingCoupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }

      // Prepare update data
      const updateData: any = { ...validation.data };
      
      // Handle duration calculation if provided
      if (req.body.duration && updateData.startDate) {
        updateData.endDate = calculateCouponEndDate(updateData.startDate, req.body.duration);
      }

      // Remove duration from update data as it's not a database field
      delete updateData.duration;

      const updatedCoupon = await storage.updateCoupon(req.params.id, updateData);
      res.json(updatedCoupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  app.patch("/api/coupons/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const updateSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        type: z.enum(["percent", "flat"]).optional(),
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0 && num <= 9999.99;
        }, "Amount must be a valid number between 0.01 and 9999.99").optional(),
        serviceId: z.number().int().positive().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
      }).superRefine((data, ctx) => {
        // Validate percentage range for percent type
        if (data.type === "percent" && data.amount) {
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
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid coupon data", details: validation.error.errors });
      }
      
      const updatedCoupon = await storage.updateCoupon(req.params.id, req.user.id, validation.data);
      res.json(updatedCoupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      if (error instanceof Error && error.message.includes("No coupon found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/coupons/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      await storage.deleteCoupon(req.params.id, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      if (error instanceof Error && error.message.includes("No coupon found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coupon delivery management routes
  app.get("/api/coupon-deliveries/:couponId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const deliveries = await storage.getCouponDeliveries(req.params.couponId, req);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching coupon deliveries:", error);
      if (error instanceof Error && error.message.includes("No coupon found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/coupon-deliveries", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const validation = insertCouponDeliverySchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid coupon delivery data", details: validation.error.errors });
      }
      
      // Validate that the coupon belongs to the authenticated stylist
      const coupon = await storage.getCoupon(validation.data.couponId, req.user.id);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      
      const delivery = await storage.createCouponDelivery(validation.data, req);
      res.status(201).json(delivery);
    } catch (error) {
      console.error("Error creating coupon delivery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/coupon-deliveries/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const updateSchema = z.object({
        sentAt: z.date().optional(),
      });
      
      const validation = updateSchema.safeParse({
        ...req.body,
        sentAt: req.body.sentAt ? new Date(req.body.sentAt) : undefined,
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid delivery data", details: validation.error.errors });
      }
      
      const updatedDelivery = await storage.updateCouponDelivery(req.params.id, req, validation.data);
      res.json(updatedDelivery);
    } catch (error) {
      console.error("Error updating coupon delivery:", error);
      if (error instanceof Error && error.message.includes("No coupon delivery found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Additional API routes can be added here
  // prefix all routes with /api

  // Public booking API routes (no authentication required)
  app.get("/api/public/stylist/:id", async (req, res) => {
    try {
      const stylist = await storage.getStylist(req.params.id);
      if (!stylist) {
        return res.status(404).json({ error: "Stylist not found" });
      }
      
      // Return only public information
      const publicStylist = {
        id: stylist.id,
        firstName: stylist.firstName,
        lastName: stylist.lastName,
        businessName: stylist.businessName,
        location: stylist.location,
        bio: stylist.bio,
        instagramHandle: stylist.instagramHandle,
        businessHours: stylist.businessHours,
      };
      
      res.json(publicStylist);
    } catch (error) {
      console.error("Error fetching public stylist:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/public/services/:stylistId", async (req, res) => {
    try {
      const services = await storage.getStylistServices(req.params.stylistId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching public services:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/public/availability/:stylistId/:date", async (req, res) => {
    try {
      const { stylistId, date } = req.params;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      const availability = await storage.getStylistAvailability(stylistId, date);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching public availability:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/public/book/:stylistId", async (req, res) => {
    try {
      const { stylistId } = req.params;
      const { firstName, lastName, phone, email, serviceId, date, startTime, optInMarketing } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !phone || !serviceId || !date || !startTime) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate stylist exists
      const stylist = await storage.getStylist(stylistId);
      if (!stylist) {
        return res.status(404).json({ error: "Stylist not found" });
      }

      // Check if service belongs to this stylist
      const services = await storage.getStylistServices(stylistId);
      const service = services.find(s => s.id === parseInt(serviceId));
      if (!service) {
        return res.status(400).json({ error: "Invalid service for this stylist" });
      }

      // Create or find existing client
      let client;
      const existingClients = await storage.getClientsByStylist(stylistId);
      const existingClient = existingClients.find(c => 
        c.phone === phone && c.firstName === firstName && c.lastName === lastName
      );

      if (existingClient) {
        client = existingClient;
        
        // Update client with any new email information or opt-in preference
        const updateData: any = {};
        if (email && email !== existingClient.email) {
          updateData.email = email;
        }
        if (typeof optInMarketing === 'boolean' && optInMarketing !== existingClient.optInMarketing) {
          updateData.optInMarketing = optInMarketing;
        }
        
        if (Object.keys(updateData).length > 0) {
          const updatedClient = await storage.updateClient(existingClient.id, updateData);
          client = updatedClient;
        }
      } else {
        // Create new client
        const newClient = await storage.createClient({
          stylistId,
          firstName,
          lastName,
          phone,
          email: email || null,
          optInMarketing: optInMarketing || false,
          notes: "Created via public booking"
        });
        client = newClient;
      }

      // Calculate end time based on service duration, fallback to stylist default
      const durationMinutes = service.durationMinutes ?? stylist.defaultAppointmentDuration ?? 30;
      const durationHours = durationMinutes / 60;
      const endTime = getSlotEndTime(startTime, durationHours);

      // Create appointment
      const appointment = await storage.createAppointment({
        stylistId,
        clientId: client.id,
        serviceId: service.id,
        date,
        startTime,
        endTime,
        status: 'confirmed',
        notes: 'Booked via public booking page',
        totalPrice: service.price
      });

      res.status(201).json({
        appointment,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          email: client.email
        },
        service: {
          id: service.id,
          serviceName: service.serviceName,
          price: service.price
        }
      });
    } catch (error) {
      console.error("Error creating public booking:", error);
      
      // Handle specific error cases
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        return res.status(409).json({ 
          error: "This time slot is already booked. Please choose a different time." 
        });
      }
      
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // AI Analytics endpoints
  app.get("/api/ai/clients-last-visit", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const clientsLastVisit = await storage.getClientsLastVisit(req.user.id);
      res.json(clientsLastVisit);
    } catch (error) {
      console.error("Error fetching clients last visit data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/ai/inactive-clients", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate query parameters with Zod
      const querySchema = z.object({
        weeks: z.string().optional().transform((val) => val ? parseInt(val) : 4)
          .refine((val) => !isNaN(val) && val >= 1 && val <= 52, {
            message: "weeks must be a number between 1 and 52"
          }),
        optIn: z.string().optional().transform((val) => val === 'true').default('true')
      });
      
      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: validation.error.errors 
        });
      }
      
      const { weeks, optIn: optInOnly } = validation.data;
      const inactiveClients = await storage.getInactiveClients(req.user.id, weeks, optInOnly);
      res.json(inactiveClients);
    } catch (error) {
      console.error("Error fetching inactive clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // AI Command execution endpoint
  app.post("/api/ai/execute", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { command } = req.body;
      
      if (!command || typeof command !== "string" || !command.trim()) {
        return res.status(400).json({ error: "Command is required" });
      }

      // Get stylist business info
      const stylist = await storage.getStylist(req.user.id);
      if (!stylist) {
        return res.status(404).json({ error: "Stylist not found" });
      }

      // Parse command using OpenAI
      console.log(`Processing AI command for stylistId: ${stylist.id}`);
      const aiResponse = await parseAICommand(command.trim(), stylist);

      if (aiResponse.action === "unknown") {
        return res.json({
          success: false,
          action: "Command Not Understood",
          details: aiResponse.error || "I couldn't understand that command. Try something like 'Send $20 coupon to inactive clients'",
          count: 0
        });
      }

      // Execute the AI action
      if (aiResponse.action === "send_coupon") {
        const result = await executeSendCouponAction(aiResponse, stylist, req.user.id);
        return res.json(result);
      }

      if (aiResponse.action === "add_client") {
        const result = await executeAddClientAction(aiResponse, req.user.id);
        return res.json(result);
      }

      // Fallback for unknown actions
      return res.json({
        success: false,
        action: "Action Not Implemented",
        details: `The action "${aiResponse.action}" is not yet implemented.`,
        count: 0
      });

    } catch (error) {
      console.error("Error executing AI command:", error);
      res.status(500).json({ 
        success: false,
        action: "Command Failed",
        details: "Internal server error occurred while processing the AI command",
        error: "Internal server error"
      });
    }
  });

  // Helper function to execute send coupon action
  async function executeSendCouponAction(aiResponse: any, stylist: any, stylistId: string) {
    try {
      // Validate GPT response has required fields
      if (!aiResponse.action || !aiResponse.weeksInactive || !aiResponse.amount) {
        return {
          success: false,
          action: "Invalid AI Response",
          details: "AI response missing required fields: action, weeksInactive, or amount",
          count: 0
        };
      }

      const weeks = aiResponse.weeksInactive;
      const amount = aiResponse.amount;
      
      // Call inactive clients logic (equivalent to /api/ai/inactive-clients?weeks=X)
      const inactiveClients = await storage.getInactiveClients(stylistId, weeks, true); // optInOnly = true
      
      if (inactiveClients.length === 0) {
        return {
          success: false,
          action: "No Inactive Clients Found",
          details: `No clients found who haven't visited in ${weeks} weeks and have opted in for marketing emails.`,
          count: 0
        };
      }

      // Create coupon (equivalent to POST /api/coupons) with name: "$X Off for You"
      const couponName = `$${amount} Off for You`;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = calculateCouponEndDate(startDate, "1month");

      const coupon = await storage.createCoupon({
        stylistId,
        name: couponName,
        type: "flat",
        amount: amount.toString(),
        startDate,
        endDate
      });

      // Prepare email content
      const businessName = stylist.businessName || "Your Stylist";
      const message = `Hi! ${businessName} here. We miss you! Here's a special $${amount} off your next visit. Book soon - this offer expires on ${new Date(endDate).toLocaleDateString()}. We can't wait to see you again!`;
      const subject = `We Miss You! $${amount} Off Your Next Visit - ${businessName}`;

      // Send coupon (equivalent to POST /api/coupon-deliveries) with client list and subject
      const clientIds = inactiveClients.map(client => client.clientId);
      
      const delivery = await storage.createCouponDelivery({
        couponId: coupon.id,
        recipientType: "custom",
        clientIds,
        message,
        subject,
        scheduledAt: new Date(),
        logicRule: null
      });

      // Return how many clients received the offer and what the offer was
      return {
        success: true,
        action: "Coupon Sent Successfully", 
        details: `${inactiveClients.length} clients received "${couponName}" offer. Expires ${new Date(endDate).toLocaleDateString()}.`,
        count: inactiveClients.length
      };

    } catch (error) {
      console.error("Error executing send coupon action:", error);
      return {
        success: false,
        action: "Coupon Send Failed",
        details: `Failed to send coupon: ${error instanceof Error ? error.message : "Unknown error"}`,
        count: 0
      };
    }
  }

  // Helper function to execute add client action
  async function executeAddClientAction(aiResponse: any, stylistId: string) {
    try {
      // Validate GPT response has required fields
      if (!aiResponse.name || !aiResponse.phone || !aiResponse.email) {
        return {
          success: false,
          action: "Missing Client Information",
          details: "❌ Sorry, I couldn't extract all the required client details. Please try again with name, phone, and email.",
          count: 0
        };
      }

      // Additional validation for phone format (basic validation for various formats)
      const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{10,}$/;
      if (!phoneRegex.test(aiResponse.phone.replace(/\s/g, ''))) {
        return {
          success: false,
          action: "Invalid Phone Number",
          details: "❌ Sorry, the phone number format appears to be invalid. Please provide a valid phone number.",
          count: 0
        };
      }

      // Additional validation for email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(aiResponse.email)) {
        return {
          success: false,
          action: "Invalid Email Address", 
          details: "❌ Sorry, the email address format appears to be invalid. Please provide a valid email address.",
          count: 0
        };
      }

      // Split name into firstName and lastName
      const nameParts = aiResponse.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Check if client already exists (by email to avoid duplicates)
      const existingClients = await storage.getClientsByStylist(stylistId);
      const existingClient = existingClients.find(client => 
        client.email?.toLowerCase() === aiResponse.email.toLowerCase()
      );

      if (existingClient) {
        return {
          success: false,
          action: "Client Already Exists",
          details: `❌ A client with email ${aiResponse.email} already exists in your client list.`,
          count: 0
        };
      }

      // Create the client
      const newClient = await storage.createClient({
        stylistId,
        firstName,
        lastName,
        email: aiResponse.email,
        phone: aiResponse.phone,
        optInMarketing: false, // Default to false, can be updated later
      });

      return {
        success: true,
        action: "Client Added Successfully",
        details: `✅ Client ${aiResponse.name} was successfully added.`,
        count: 1
      };

    } catch (error) {
      console.error("Error executing add client action:", error);
      return {
        success: false,
        action: "Add Client Failed",
        details: error instanceof Error ? error.message : "Unknown error occurred while adding client",
        count: 0
      };
    }
  }

  // POST /api/ai/schedule-reminder - Schedule a follow-up reminder
  app.post("/api/ai/schedule-reminder", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = scheduleReminderSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid notification data", 
          details: validation.error.errors 
        });
      }

      // Calculate the target date based on daysAgo
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - validation.data.daysAgo);
      const targetDateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get all appointments for the stylist on the target date
      const appointments = await storage.getAppointmentsByStylist(req.user.id, targetDateString);
      
      // Get unique client IDs from appointments
      const clientIds = Array.from(new Set(appointments.map(appointment => appointment.clientId)));

      if (clientIds.length === 0) {
        return res.status(200).json({ 
          message: "No clients found with appointments on the target date",
          count: 0,
          targetDate: targetDateString
        });
      }

      // Set scheduled time (immediate if not provided)
      const scheduledAt = validation.data.scheduledAt 
        ? new Date(validation.data.scheduledAt)
        : new Date();

      // Create notifications for each client
      const notifications = [];
      for (const clientId of clientIds) {
        const notificationData = {
          stylistId: req.user.id,
          clientId,
          type: validation.data.type,
          subject: validation.data.subject,
          message: validation.data.message,
          scheduledAt,
        };

        try {
          const notification = await storage.createNotification(notificationData);
          notifications.push(notification);
        } catch (error) {
          console.error(`Error creating notification for client ${clientId}:`, error);
          // Continue with other clients even if one fails
        }
      }

      res.status(201).json({ 
        message: `Successfully scheduled ${notifications.length} reminder(s)`,
        count: notifications.length,
        targetDate: targetDateString,
        notifications
      });
    } catch (error) {
      console.error("Error creating reminders:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/ai/analytics - Get business analytics for specified period
  app.get("/api/ai/analytics", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { period } = req.query;
      
      if (!period || (period !== 'week' && period !== 'month')) {
        return res.status(400).json({ 
          error: "Invalid period parameter. Must be 'week' or 'month'" 
        });
      }

      const analytics = await storage.getAnalytics(req.user.id, period as 'week' | 'month');
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/ai/suggest-slots - Get suggested appointment slots for a service
  app.get("/api/ai/suggest-slots", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { serviceId, days } = req.query;
      
      if (!serviceId || !days) {
        return res.status(400).json({ 
          error: "Missing required parameters: serviceId, days" 
        });
      }

      const serviceIdNum = parseInt(serviceId as string);
      const daysNum = parseInt(days as string);

      if (isNaN(serviceIdNum) || isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
        return res.status(400).json({ 
          error: "Invalid parameters. serviceId must be a number, days must be 1-30" 
        });
      }

      const suggestions = await storage.getSuggestedSlots(req.user.id, serviceIdNum, daysNum);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching slot suggestions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/ai/book-appointment - AI-powered appointment booking
  app.post("/api/ai/book-appointment", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { command } = req.body;
      
      if (!command || typeof command !== "string" || !command.trim()) {
        return res.status(400).json({ error: "Command is required" });
      }

      // Get stylist business info
      const stylist = await storage.getStylist(req.user.id);
      if (!stylist) {
        return res.status(404).json({ error: "Stylist not found" });
      }

      // Parse command using OpenAI
      console.log(`Processing AI scheduling command for stylistId: ${stylist.id}`);
      const aiResponse = await parseSchedulingCommand(command.trim(), stylist);

      if (aiResponse.action === "unknown") {
        return res.status(400).json({
          success: false,
          error: aiResponse.error || "I couldn't understand that command. Try something like 'Book Ashley for a haircut at 2pm on Friday'"
        });
      }

      if (aiResponse.action !== "book_appointment" && aiResponse.action !== "reschedule_appointment") {
        return res.status(400).json({
          success: false,
          error: "This endpoint only handles booking and rescheduling appointments. Use the availability endpoint for time blocking."
        });
      }

      // IMPORTANT: Explicit validation calls for security and data integrity
      
      // Validate required fields
      if (!aiResponse.clientName || !aiResponse.date || !aiResponse.time) {
        return res.status(400).json({
          success: false,
          error: "Missing required information: client name, date, and time are required"
        });
      }

      // Additional explicit date/time validation beyond Zod
      const appointmentDate = new Date(aiResponse.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        return res.status(400).json({
          success: false,
          error: "Cannot book appointments in the past"
        });
      }

      // Validate appointment is not too far in the future (1 year max)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (appointmentDate > oneYearFromNow) {
        return res.status(400).json({
          success: false,
          error: "Cannot book appointments more than 1 year in advance"
        });
      }

      // Validate time format and bounds
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(aiResponse.time)) {
        return res.status(400).json({
          success: false,
          error: "Invalid time format. Use HH:MM format (00:00-23:59)"
        });
      }

      // Get all clients and services for the stylist
      const [clients, services] = await Promise.all([
        storage.getClientsByStylist(req.user.id),
        storage.getStylistServices(req.user.id)
      ]);

      // Find matching client
      const matchedClient = findBestClientMatch(aiResponse.clientName, clients);
      if (!matchedClient) {
        return res.status(404).json({
          success: false,
          error: `Client "${aiResponse.clientName}" not found. Please add them to your client list first.`
        });
      }

      // Find matching service (optional, will use default duration if not found)
      let matchedService = null;
      let durationMinutes = stylist.defaultAppointmentDuration || 30;
      
      if (aiResponse.serviceName) {
        matchedService = findBestServiceMatch(aiResponse.serviceName, services);
        if (matchedService) {
          // IMPORTANT: Validate service belongs to the stylist for security
          if (matchedService.stylistId !== req.user.id) {
            return res.status(403).json({
              success: false,
              error: "Access denied: Service does not belong to authenticated stylist"
            });
          }
          durationMinutes = matchedService.durationMinutes || durationMinutes;
        }
      }

      // IMPORTANT: Explicit duration bounds validation
      if (durationMinutes < 15 || durationMinutes > 480) {
        return res.status(400).json({
          success: false,
          error: "Invalid appointment duration. Must be between 15 minutes and 8 hours"
        });
      }

      const endTime = calculateEndTime(aiResponse.time, durationMinutes);

      // IMPORTANT: Explicit business hours validation with stylist-specific hours
      let businessStart = "09:00";
      let businessEnd = "18:00";
      
      // Use stylist's actual business hours if available
      if (stylist.businessHours) {
        const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayHours = stylist.businessHours[dayOfWeek];
        if (dayHours && !dayHours.isClosed) {
          businessStart = dayHours.open;
          businessEnd = dayHours.close;
        } else if (dayHours?.isClosed) {
          return res.status(400).json({
            success: false,
            error: `Business is closed on ${dayOfWeek}s`
          });
        }
      }

      // Check if within business hours using actual business hours
      if (!isWithinBusinessHours(aiResponse.time, endTime, businessStart, businessEnd)) {
        return res.status(400).json({
          success: false,
          error: `Appointment time is outside business hours (${businessStart}-${businessEnd})`
        });
      }

      // Check availability
      const availabilityCheck = await checkAvailability(
        req.user.id, 
        aiResponse.date, 
        aiResponse.time, 
        durationMinutes
      );

      if (!availabilityCheck.isAvailable) {
        return res.status(409).json({
          success: false,
          error: availabilityCheck.reason || "Time slot not available"
        });
      }

      // IMPORTANT: Enhanced rescheduling logic to handle multiple appointments properly
      let appointmentToReschedule = null;
      let excludeAppointmentId: string | undefined = undefined;

      if (aiResponse.action === "reschedule_appointment") {
        // For rescheduling, we need to find the existing appointment
        if (aiResponse.existingAppointmentId) {
          // If AI provided appointment ID, use it
          appointmentToReschedule = await storage.getAppointment(aiResponse.existingAppointmentId);
          if (!appointmentToReschedule || appointmentToReschedule.stylistId !== req.user.id) {
            return res.status(404).json({
              success: false,
              error: `Appointment with ID ${aiResponse.existingAppointmentId} not found or access denied`
            });
          }
          excludeAppointmentId = appointmentToReschedule.id;
        } else {
          // If no appointment ID provided, find the most recent appointment for this client
          const clientAppointments = await storage.getAppointmentsByStylist(req.user.id);
          const matchingAppointments = clientAppointments
            .filter(apt => apt.clientId === matchedClient.id)
            .filter(apt => apt.status === "scheduled" || apt.status === "confirmed")
            .sort((a, b) => {
              // Sort by date desc, then by start time desc to get the most recent future appointment
              const dateCompare = b.date.localeCompare(a.date);
              if (dateCompare !== 0) return dateCompare;
              return b.startTime.localeCompare(a.startTime);
            });

          if (matchingAppointments.length === 0) {
            return res.status(404).json({
              success: false,
              error: `No scheduled appointments found for ${matchedClient.firstName} ${matchedClient.lastName} to reschedule`
            });
          }

          if (matchingAppointments.length > 1) {
            // Multiple appointments found - provide helpful error with appointment details
            const appointmentDetails = matchingAppointments.slice(0, 3).map(apt => 
              `${apt.date} at ${apt.startTime}`
            ).join(', ');
            return res.status(400).json({
              success: false,
              error: `Multiple appointments found for ${matchedClient.firstName} ${matchedClient.lastName}. ` +
                     `Please be more specific or cancel one first. Appointments: ${appointmentDetails}` +
                     (matchingAppointments.length > 3 ? ` and ${matchingAppointments.length - 3} more...` : '')
            });
          }

          appointmentToReschedule = matchingAppointments[0];
          excludeAppointmentId = appointmentToReschedule.id;
        }
      }

      // Check for conflicts (excluding the appointment being rescheduled)
      const conflictCheck = await checkAppointmentConflicts(
        req.user.id,
        aiResponse.date,
        aiResponse.time,
        durationMinutes,
        excludeAppointmentId
      );

      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          error: "Time slot conflicts with an existing appointment"
        });
      }

      let appointment;
      
      if (aiResponse.action === "reschedule_appointment" && appointmentToReschedule) {
        // Update the existing appointment for rescheduling
        const updateData = {
          date: aiResponse.date,
          startTime: aiResponse.time,
          endTime: endTime,
          serviceId: matchedService?.id || appointmentToReschedule.serviceId,
          totalPrice: (matchedService?.price || appointmentToReschedule.totalPrice).toString(),
          notes: appointmentToReschedule.notes ? 
            `${appointmentToReschedule.notes} | Rescheduled via AI: ${command.trim()}` : 
            `Rescheduled via AI: ${command.trim()}`,
          updatedAt: new Date(),
        };
        
        appointment = await storage.updateAppointment(appointmentToReschedule.id, updateData);
      } else {
        // Create new appointment for booking
        const appointmentData = {
          stylistId: req.user.id,
          clientId: matchedClient.id,
          serviceId: matchedService?.id || 1, // Default service ID if no specific service
          date: aiResponse.date,
          startTime: aiResponse.time,
          endTime: endTime,
          status: "scheduled" as const,
          totalPrice: (matchedService?.price || 0).toString(),
          notes: `AI-booked: ${command.trim()}`
        };

        appointment = await storage.createAppointment(appointmentData);
      }

      const actionText = aiResponse.action === "reschedule_appointment" ? "rescheduled" : "booked";
      const statusCode = aiResponse.action === "reschedule_appointment" ? 200 : 201;
      
      res.status(statusCode).json({
        success: true,
        action: aiResponse.action,
        message: `Successfully ${actionText} ${matchedClient.firstName} ${matchedClient.lastName} for ${matchedService?.serviceName || 'appointment'} on ${aiResponse.date} at ${aiResponse.time}`,
        appointment: {
          ...appointment,
          clientName: `${matchedClient.firstName} ${matchedClient.lastName}`,
          serviceName: matchedService?.serviceName || 'General Appointment',
          duration: durationMinutes,
          wasRescheduled: aiResponse.action === "reschedule_appointment"
        }
      });

    } catch (error) {
      console.error("Error booking appointment:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error occurred while booking appointment"
      });
    }
  });

  // PATCH /api/ai/update-availability - AI-powered availability management
  app.patch("/api/ai/update-availability", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { command } = req.body;
      
      if (!command || typeof command !== "string" || !command.trim()) {
        return res.status(400).json({ error: "Command is required" });
      }

      // Get stylist business info
      const stylist = await storage.getStylist(req.user.id);
      if (!stylist) {
        return res.status(404).json({ error: "Stylist not found" });
      }

      // Parse command using OpenAI
      console.log(`Processing AI availability command: "${command.trim()}" for stylist ${stylist.businessName}`);
      const aiResponse = await parseSchedulingCommand(command.trim(), stylist);

      if (aiResponse.action === "unknown") {
        return res.status(400).json({
          success: false,
          error: aiResponse.error || "I couldn't understand that command. Try something like 'Block off next Monday morning' or 'Set my hours next week from 10am-4pm'"
        });
      }

      if (aiResponse.action !== "block_time" && aiResponse.action !== "set_hours") {
        return res.status(400).json({
          success: false,
          error: "This endpoint only handles time blocking and setting hours. Use the booking endpoint for appointments."
        });
      }

      if (aiResponse.action === "block_time") {
        // Block off time
        if (!aiResponse.date || !aiResponse.startTime || !aiResponse.endTime) {
          return res.status(400).json({
            success: false,
            error: "Missing required information: date, start time, and end time are required for blocking time"
          });
        }

        // Get existing availability for the date
        const existingAvailability = await storage.getStylistAvailability(req.user.id, aiResponse.date);
        
        if (!existingAvailability || !existingAvailability.isOpen) {
          return res.status(400).json({
            success: false,
            error: "No availability set for this date. Please set your hours first."
          });
        }

        // Remove the blocked time from existing time ranges
        const timeRanges = existingAvailability.timeRanges || [];
        const blockStart = aiResponse.startTime;
        const blockEnd = aiResponse.endTime;
        
        const newTimeRanges = [];
        
        for (const range of timeRanges) {
          if (range.end <= blockStart || range.start >= blockEnd) {
            // No overlap, keep the range
            newTimeRanges.push(range);
          } else {
            // There's overlap, split the range
            if (range.start < blockStart) {
              newTimeRanges.push({ start: range.start, end: blockStart });
            }
            if (range.end > blockEnd) {
              newTimeRanges.push({ start: blockEnd, end: range.end });
            }
          }
        }

        await storage.updateStylistAvailability(req.user.id, aiResponse.date, { timeRanges: newTimeRanges });

        res.json({
          success: true,
          message: `Successfully blocked time from ${blockStart} to ${blockEnd} on ${aiResponse.date}`,
          date: aiResponse.date,
          blockedTime: { start: blockStart, end: blockEnd }
        });

      } else if (aiResponse.action === "set_hours") {
        // Set working hours
        if (!aiResponse.days || !aiResponse.startTime || !aiResponse.endTime) {
          return res.status(400).json({
            success: false,
            error: "Missing required information: days, start time, and end time are required for setting hours"
          });
        }

        const results = [];
        const currentDate = new Date();
        
        // Calculate dates for the specified days
        for (const dayName of aiResponse.days) {
          // Find the next occurrence of this day
          const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName.toLowerCase());
          if (dayIndex === -1) continue;
          
          const targetDate = new Date(currentDate);
          const currentDay = targetDate.getDay();
          const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
          if (daysUntilTarget === 0 && targetDate.getHours() > 18) {
            // If it's the same day but after business hours, set for next week
            targetDate.setDate(targetDate.getDate() + 7);
          } else {
            targetDate.setDate(targetDate.getDate() + daysUntilTarget);
          }
          
          const dateString = targetDate.toISOString().split('T')[0];
          
          const availabilityData = {
            stylistId: req.user.id,
            date: dateString,
            isOpen: true,
            timeRanges: [{ start: aiResponse.startTime, end: aiResponse.endTime }]
          };

          try {
            await storage.setStylistAvailability(availabilityData);
            results.push({ date: dateString, day: dayName });
          } catch (error) {
            console.error(`Error setting availability for ${dateString}:`, error);
          }
        }

        res.json({
          success: true,
          message: `Successfully set hours ${aiResponse.startTime}-${aiResponse.endTime} for ${results.length} day(s)`,
          hours: { start: aiResponse.startTime, end: aiResponse.endTime },
          updatedDates: results
        });
      }

    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error occurred while updating availability"
      });
    }
  });

  // REMOVED: Notification job control endpoints were removed for security
  // These endpoints exposed system-wide data and controls to any authenticated user
  // Notification job processing happens automatically in the background

  const httpServer = createServer(app);

  return httpServer;
}
