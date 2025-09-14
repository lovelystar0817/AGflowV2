import { stylists, clients, stylistServices, stylistAvailability, appointments, type Stylist, type InsertStylist, type Client, type InsertClient, type UpdateProfile, type StylistService, type InsertStylistService, type StylistAvailability, type InsertStylistAvailability, type Appointment, type InsertAppointment, type TimeRange, generateHourlySlots, filterAvailableSlots, getSlotEndTime } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
  
  // Availability management
  getStylistAvailability(stylistId: string, date: string): Promise<StylistAvailability | undefined>;
  setStylistAvailability(availability: InsertStylistAvailability): Promise<StylistAvailability>;
  updateStylistAvailability(stylistId: string, date: string, updates: { isOpen?: boolean; timeRanges?: { start: string; end: string }[] }): Promise<StylistAvailability>;
  
  // Appointment management
  getAppointmentsByStylist(stylistId: string, date?: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  
  // Slot management
  getAvailableSlots(stylistId: string, date: string): Promise<string[]>;
  getSlotsCount(stylistId: string, date: string): Promise<{ total: number; available: number }>;
  
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
    // Update services first to get the service names for legacy field
    let serviceNames: string[] = [];
    if (profile.services) {
      // Convert from form data (number prices) to database data (string prices)
      const servicesForDB = profile.services.map(service => ({
        serviceName: service.serviceName,
        price: service.price.toString(),
        isCustom: service.isCustom
      }));
      await this.replaceStylistServices(id, servicesForDB);
      serviceNames = profile.services.map(service => service.serviceName);
    }
    
    // Update the stylist profile (including legacy servicesOffered field for completeness check)
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
        // Populate legacy field for backward compatibility with isProfileComplete
        servicesOffered: profile.services ? serviceNames : undefined,
      })
      .where(eq(stylists.id, id))
      .returning();
    
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

  // Availability management methods
  async getStylistAvailability(stylistId: string, date: string): Promise<StylistAvailability | undefined> {
    const [availability] = await db
      .select()
      .from(stylistAvailability)
      .where(and(eq(stylistAvailability.stylistId, stylistId), eq(stylistAvailability.date, date)));
    return availability || undefined;
  }

  async setStylistAvailability(availability: InsertStylistAvailability): Promise<StylistAvailability> {
    // Use atomic upsert to avoid race conditions
    const timeRanges: TimeRange[] = (availability.timeRanges as TimeRange[]) ?? [];
    const payload: typeof stylistAvailability.$inferInsert = {
      stylistId: availability.stylistId,
      date: availability.date,
      isOpen: availability.isOpen,
      timeRanges,
    };
    
    const [result] = await db
      .insert(stylistAvailability)
      .values(payload)
      .onConflictDoUpdate({
        target: [stylistAvailability.stylistId, stylistAvailability.date],
        set: {
          isOpen: payload.isOpen,
          timeRanges: payload.timeRanges,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async updateStylistAvailability(stylistId: string, date: string, updates: { isOpen?: boolean; timeRanges?: { start: string; end: string }[] }): Promise<StylistAvailability> {
    const [updatedAvailability] = await db
      .update(stylistAvailability)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(stylistAvailability.stylistId, stylistId), eq(stylistAvailability.date, date)))
      .returning();
    
    if (!updatedAvailability) {
      throw new Error(`No availability found for stylist ${stylistId} on date ${date}`);
    }
    
    return updatedAvailability;
  }

  // Appointment management methods
  async getAppointmentsByStylist(stylistId: string, date?: string): Promise<Appointment[]> {
    if (date) {
      return await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.stylistId, stylistId), eq(appointments.date, date)));
    }
    
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.stylistId, stylistId));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    
    if (!updatedAppointment) {
      throw new Error(`No appointment found with id ${id}`);
    }
    
    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Slot management methods
  async getAvailableSlots(stylistId: string, date: string): Promise<string[]> {
    // Get stylist availability for the date
    const availability = await this.getStylistAvailability(stylistId, date);
    
    if (!availability || !availability.isOpen || !availability.timeRanges || availability.timeRanges.length === 0) {
      return [];
    }
    
    // Generate all possible hourly slots from time ranges
    const allSlots = generateHourlySlots(availability.timeRanges);
    
    // Get booked slots for this date
    const bookedAppointments = await this.getAppointmentsByStylist(stylistId, date);
    const bookedSlots = bookedAppointments
      .filter(app => app.status === 'confirmed')
      .map(app => app.startTime);
    
    // Filter out booked slots
    return filterAvailableSlots(allSlots, bookedSlots);
  }

  async getSlotsCount(stylistId: string, date: string): Promise<{ total: number; available: number }> {
    // Get stylist availability for the date
    const availability = await this.getStylistAvailability(stylistId, date);
    
    if (!availability || !availability.isOpen || !availability.timeRanges || availability.timeRanges.length === 0) {
      return { total: 0, available: 0 };
    }
    
    // Generate all possible hourly slots from time ranges
    const allSlots = generateHourlySlots(availability.timeRanges);
    const totalSlots = allSlots.length;
    
    // Get available slots
    const availableSlots = await this.getAvailableSlots(stylistId, date);
    
    return {
      total: totalSlots,
      available: availableSlots.length
    };
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
