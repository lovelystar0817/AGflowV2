import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import rateLimit from "express-rate-limit";
import { storage } from "./storage-instance";
import { insertClientSchema, updateProfileSchema, serviceFormSchema, availabilitySchema, insertAppointmentSchema, insertCouponSchema, couponFormSchema, insertCouponDeliverySchema, getSlotEndTime, type Client, type InsertStylistService, type Appointment, type Coupon, type CouponDelivery, type InsertCouponDelivery } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to auth routes
  app.use("/api/register", authLimiter);
  app.use("/api/login", authLimiter);

  // Setup authentication routes
  setupAuth(app);

  // Client management routes
  app.get("/api/clients", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const clients = await storage.getClientsByStylist(req.user.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Internal server error" });
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
        return res.status(400).json({ error: "Invalid client data", details: validation.error.errors });
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
        return res.status(400).json({ error: "Invalid client data", details: validation.error.errors });
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
      
      const services = await storage.getStylistServices(req.user.id);
      res.json(services);
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
        return res.status(400).json({ error: "Invalid service data", details: validation.error.errors });
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
        return res.status(400).json({ error: "Invalid service data", details: validation.error.errors });
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
      
      const appointments = await storage.getAppointmentsByStylist(
        req.user.id, 
        date && typeof date === "string" ? date : undefined
      );
      res.json(appointments);
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
        return res.status(400).json({ error: "Invalid status value", details: validation.error.errors });
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
        return res.status(400).json({ error: "Invalid appointment data", details: validation.error.errors });
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
      
      const coupons = await storage.getCouponsByStylist(req.user.id);
      res.json(coupons);
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
        return res.status(400).json({ error: "Invalid coupon data", details: validation.error.errors });
      }
      
      const coupon = await storage.createCoupon(validation.data);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
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
      
      const deliveries = await storage.getCouponDeliveries(req.params.couponId, req.user.id);
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
      
      const delivery = await storage.createCouponDelivery(validation.data);
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
      
      const updatedDelivery = await storage.updateCouponDelivery(req.params.id, req.user.id, validation.data);
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

      // Calculate end time based on service duration (assume 1 hour default)
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const endHour = startMinute >= 30 ? startHour + 2 : startHour + 1;
      const endMinute = startMinute >= 30 ? startMinute - 30 : startMinute + 30;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

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
      
      // Parse query parameters with defaults
      const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 4;
      const optInOnly = req.query.optIn === 'true';
      
      // Validate weeks parameter
      if (isNaN(weeks) || weeks < 1 || weeks > 52) {
        return res.status(400).json({ error: "Invalid weeks parameter. Must be between 1 and 52." });
      }
      
      const inactiveClients = await storage.getInactiveClients(req.user.id, weeks, optInOnly);
      res.json(inactiveClients);
    } catch (error) {
      console.error("Error fetching inactive clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
