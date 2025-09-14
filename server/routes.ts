import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import rateLimit from "express-rate-limit";
import { storage } from "./storage-instance";
import { insertClientSchema, updateProfileSchema, serviceFormSchema, type Client, type InsertStylistService } from "@shared/schema";
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

  // Additional API routes can be added here
  // prefix all routes with /api

  const httpServer = createServer(app);

  return httpServer;
}
