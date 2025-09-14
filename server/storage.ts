import { stylists, clients, stylistServices, type Stylist, type InsertStylist, type Client, type InsertClient, type UpdateProfile, type StylistService, type InsertStylistService } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getStylist(id: string): Promise<Stylist | undefined>;
  getStylistByEmail(email: string): Promise<Stylist | undefined>;
  createStylist(stylist: InsertStylist): Promise<Stylist>;
  updateStylistProfile(id: string, profile: UpdateProfile): Promise<Stylist>;
  
  // Service management
  getStylistServices(stylistId: string): Promise<StylistService[]>;
  createStylistService(service: InsertStylistService): Promise<StylistService>;
  updateStylistService(id: number, updates: Partial<InsertStylistService>): Promise<StylistService>;
  deleteStylistService(id: number): Promise<void>;
  replaceStylistServices(stylistId: string, services: Omit<InsertStylistService, 'stylistId'>[]): Promise<StylistService[]>;
  
  // Client management
  getClientsByStylist(stylistId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
  sessionStore: session.Store;
  
  // Legacy method names for compatibility with auth blueprint
  getUser(id: string): Promise<Stylist | undefined>;
  getUserByUsername(username: string): Promise<Stylist | undefined>;
  createUser(user: InsertStylist): Promise<Stylist>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getStylist(id: string): Promise<Stylist | undefined> {
    const [stylist] = await db.select().from(stylists).where(eq(stylists.id, id));
    return stylist || undefined;
  }

  async getStylistByEmail(email: string): Promise<Stylist | undefined> {
    const [stylist] = await db.select().from(stylists).where(eq(stylists.email, email));
    return stylist || undefined;
  }

  async createStylist(insertStylist: InsertStylist): Promise<Stylist> {
    const [stylist] = await db
      .insert(stylists)
      .values({
        email: insertStylist.email,
        firstName: insertStylist.firstName,
        lastName: insertStylist.lastName,
        passwordHash: insertStylist.password,
        businessName: insertStylist.businessName,
      })
      .returning();
    return stylist;
  }

  async updateStylistProfile(id: string, profile: UpdateProfile): Promise<Stylist> {
    // Update the stylist profile (excluding services which are handled separately)
    const [stylist] = await db
      .update(stylists)
      .set({
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        businessHours: profile.businessHours,
        yearsOfExperience: profile.yearsOfExperience,
        instagramHandle: profile.instagramHandle,
        bookingLink: profile.bookingLink,
      })
      .where(eq(stylists.id, id))
      .returning();
    
    // Update services separately
    if (profile.services) {
      // Convert from form data (number prices) to database data (string prices)
      const servicesForDB = profile.services.map(service => ({
        serviceName: service.serviceName,
        price: service.price.toString(),
        isCustom: service.isCustom
      }));
      await this.replaceStylistServices(id, servicesForDB);
    }
    
    return stylist;
  }

  // Service management methods
  async getStylistServices(stylistId: string): Promise<StylistService[]> {
    return await db.select().from(stylistServices).where(eq(stylistServices.stylistId, stylistId));
  }

  async createStylistService(service: InsertStylistService): Promise<StylistService> {
    const [newService] = await db.insert(stylistServices).values(service).returning();
    return newService;
  }

  async updateStylistService(id: number, updates: Partial<InsertStylistService>): Promise<StylistService> {
    const [updatedService] = await db
      .update(stylistServices)
      .set(updates)
      .where(eq(stylistServices.id, id))
      .returning();
    return updatedService;
  }

  async deleteStylistService(id: number): Promise<void> {
    await db.delete(stylistServices).where(eq(stylistServices.id, id));
  }

  async replaceStylistServices(stylistId: string, services: Omit<InsertStylistService, 'stylistId'>[]): Promise<StylistService[]> {
    // Delete existing services for this stylist
    await db.delete(stylistServices).where(eq(stylistServices.stylistId, stylistId));
    
    // Insert new services
    if (services.length > 0) {
      const servicesToInsert = services.map(service => ({
        ...service,
        stylistId
      }));
      
      return await db.insert(stylistServices).values(servicesToInsert).returning();
    }
    
    return [];
  }

  // Client management methods
  async getClientsByStylist(stylistId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.stylistId, stylistId));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Legacy methods for compatibility with auth blueprint
  async getUser(id: string): Promise<Stylist | undefined> {
    return this.getStylist(id);
  }

  async getUserByUsername(username: string): Promise<Stylist | undefined> {
    return this.getStylistByEmail(username);
  }

  async createUser(user: InsertStylist): Promise<Stylist> {
    return this.createStylist(user);
  }
}

export const storage = new DatabaseStorage();
