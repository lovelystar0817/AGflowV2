import { stylists, clients, stylistServices, stylistAvailability, appointments, coupons, couponDeliveries, notifications, type Stylist, type InsertStylist, type Client, type InsertClient, type UpdateProfile, type StylistService, type InsertStylistService, type StylistAvailability, type InsertStylistAvailability, type Appointment, type InsertAppointment, type Coupon, type InsertCoupon, type CouponDelivery, type InsertCouponDelivery, type Notification, type InsertNotification, type TimeRange, generateHourlySlots, generate30MinuteSlots, filterAvailableSlots, getSlotEndTime, calculateCouponEndDate, isCouponActive } from "@shared/schema";
import { db } from "./db";
import { getResendEmailService } from "./resend-email-service";
import { eq, and, sql, like, ilike, count, asc, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import type { Request } from "express";

const PostgresSessionStore = connectPg(session);

// Multi-tenant helper function
export function getTenant(req: Request): string {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    throw new Error("Authentication required");
  }
  if (!req.user || !req.user.id) {
    throw new Error("User ID not found in session");
  }
  return req.user.id;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  q?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IStorage {
  getStylist(id: string): Promise<Stylist | undefined>;
  getStylistByEmail(email: string): Promise<Stylist | undefined>;
  createStylist(stylist: InsertStylist): Promise<Stylist>;
  updateStylistProfile(id: string, profile: UpdateProfile): Promise<Stylist>;
  updateBusinessSettings(id: string, settings: any): Promise<Stylist>;
  
  // Service management
  getStylistServices(stylistId: string): Promise<StylistService[]>;
  getStylistServicesPaginated(stylistId: string, params: PaginationParams): Promise<PaginatedResponse<StylistService>>;
  createStylistService(service: InsertStylistService): Promise<StylistService>;
  updateStylistService(id: number, stylistId: string, updates: Partial<InsertStylistService>): Promise<StylistService>;
  deleteStylistService(id: number, stylistId: string): Promise<void>;
  replaceStylistServices(stylistId: string, services: Omit<InsertStylistService, 'stylistId'>[]): Promise<StylistService[]>;
  
  // Client management
  getClientsByStylist(stylistId: string): Promise<Client[]>;
  getClientsByStylistPaginated(stylistId: string, params: PaginationParams): Promise<PaginatedResponse<Client>>;
  getClient(id: string, stylistId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, stylistId: string, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string, stylistId: string): Promise<void>;
  
  // Availability management
  getStylistAvailability(stylistId: string, date: string): Promise<StylistAvailability | undefined>;
  setStylistAvailability(availability: InsertStylistAvailability): Promise<StylistAvailability>;
  updateStylistAvailability(stylistId: string, date: string, updates: { isOpen?: boolean; timeRanges?: { start: string; end: string }[] }): Promise<StylistAvailability>;
  
  // Appointment management
  getAppointmentsByStylist(stylistId: string, date?: string): Promise<Appointment[]>;
  getAppointmentsByStylistPaginated(stylistId: string, params: PaginationParams, date?: string): Promise<PaginatedResponse<Appointment>>;
  getAppointmentsWithDetails(stylistId: string, date?: string): Promise<any[]>;
  getAppointment(id: string, stylistId: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, stylistId: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string, stylistId: string): Promise<void>;
  
  // Slot management
  getAvailableSlots(stylistId: string, date: string): Promise<string[]>;
  getSlotsCount(stylistId: string, date: string): Promise<{ total: number; available: number }>;
  
  // Coupon management
  getCouponsByStylist(stylistId: string): Promise<Coupon[]>;
  getCouponsByStylistPaginated(stylistId: string, params: PaginationParams): Promise<PaginatedResponse<Coupon>>;
  getCoupon(id: string, stylistId: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, stylistId: string, updates: Omit<Partial<InsertCoupon>, 'stylistId'>): Promise<Coupon>;
  deleteCoupon(id: string, stylistId: string): Promise<void>;
  getActiveCouponsCount(stylistId: string): Promise<number>;
  
  // Coupon delivery management
  getCouponDeliveries(couponId: string, req: Request): Promise<CouponDelivery[]>;
  createCouponDelivery(delivery: InsertCouponDelivery, req: Request): Promise<CouponDelivery>;
  updateCouponDelivery(id: string, req: Request, updates: { sentAt?: Date }): Promise<CouponDelivery>;
  getClientVisitCount(stylistId: string, clientId: string): Promise<number>;
  
  sessionStore: session.Store;
  
  // AI Analytics methods
  getClientsLastVisit(stylistId: string): Promise<{ clientId: string; fullName: string; lastVisitDate: string | null; daysSince: number | null; totalVisits: number }[]>;
  getInactiveClients(stylistId: string, weeks?: number, optInOnly?: boolean): Promise<{ clientId: string; fullName: string; email: string | null; daysSinceLastVisit: number | null; totalVisits: number }[]>;
  
  // Notification management  
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(stylistId: string): Promise<Notification[]>;
  getStylistsWithPendingNotifications(): Promise<{ stylistId: string }[]>;
  claimPendingNotifications(stylistId: string, limit?: number): Promise<(Notification & { clientEmail: string | null; stylistFirstName: string | null; stylistLastName: string | null })[]>;
  updateNotificationStatus(id: string, req: Request, status: 'sent' | 'failed' | 'processing', errorMessage?: string): Promise<void>;
  
  // Analytics
  getAnalytics(stylistId: string, period: 'week' | 'month'): Promise<{
    appointmentCount: number;
    revenue: number;
    topServices: { serviceName: string; count: number; revenue: number }[];
    busyDays: { date: string; appointmentCount: number }[];
    loyalClients: { clientId: string; fullName: string; totalVisits: number }[];
  }>;
  
  // Slot suggestions
  getSuggestedSlots(stylistId: string, serviceId: number, days: number): Promise<{
    date: string;
    slots: string[];
  }[]>;
  
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

  async updateBusinessSettings(id: string, settings: any): Promise<Stylist> {
    const [stylist] = await db
      .update(stylists)
      .set({
        businessName: settings.businessName,
        businessType: settings.businessType,
        bio: settings.bio,
        location: settings.location,
        smsSenderName: settings.smsSenderName,
        defaultAppointmentDuration: settings.defaultAppointmentDuration,
        preferredSlotFormat: settings.preferredSlotFormat,
        showPublicly: settings.showPublicly,
      })
      .where(eq(stylists.id, id))
      .returning();
    
    return stylist;
  }

  // Service management methods
  async getStylistServices(stylistId: string): Promise<StylistService[]> {
    return await db.select().from(stylistServices).where(eq(stylistServices.stylistId, stylistId));
  }

  async getStylistServicesPaginated(stylistId: string, params: PaginationParams): Promise<PaginatedResponse<StylistService>> {
    const { page: rawPage, pageSize: rawPageSize, q } = params;
    const page = Math.max(1, rawPage);
    const pageSize = Math.min(Math.max(1, rawPageSize), 100); // Cap at 100
    const offset = (page - 1) * pageSize;

    // Build where condition
    let whereCondition = eq(stylistServices.stylistId, stylistId);
    if (q && q.trim()) {
      whereCondition = and(
        eq(stylistServices.stylistId, stylistId),
        ilike(stylistServices.serviceName, `%${q.trim()}%`)
      );
    }

    // Get items with pagination
    const items = await db
      .select()
      .from(stylistServices)
      .where(whereCondition)
      .orderBy(asc(stylistServices.serviceName))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(stylistServices)
      .where(whereCondition);
    
    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async createStylistService(service: InsertStylistService): Promise<StylistService> {
    const [newService] = await db.insert(stylistServices).values(service).returning();
    return newService;
  }

  async updateStylistService(id: number, stylistId: string, updates: Partial<InsertStylistService>): Promise<StylistService> {
    const [updatedService] = await db
      .update(stylistServices)
      .set(updates)
      .where(and(eq(stylistServices.id, id), eq(stylistServices.stylistId, stylistId)))
      .returning();
    
    if (!updatedService) {
      throw new Error(`No service found with id ${id} for stylist ${stylistId}`);
    }
    
    return updatedService;
  }

  async deleteStylistService(id: number, stylistId: string): Promise<void> {
    const result = await db
      .delete(stylistServices)
      .where(and(eq(stylistServices.id, id), eq(stylistServices.stylistId, stylistId)))
      .returning({ id: stylistServices.id });
    
    if (result.length === 0) {
      throw new Error(`No service found with id ${id} for stylist ${stylistId}`);
    }
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

  async getClientsByStylistPaginated(stylistId: string, params: PaginationParams): Promise<PaginatedResponse<Client>> {
    const { page: rawPage, pageSize: rawPageSize, q } = params;
    const page = Math.max(1, rawPage);
    const pageSize = Math.min(Math.max(1, rawPageSize), 100); // Cap at 100
    const offset = (page - 1) * pageSize;

    // Build where condition
    let whereCondition = eq(clients.stylistId, stylistId);
    if (q && q.trim()) {
      const searchPattern = `%${q.trim()}%`;
      whereCondition = and(
        eq(clients.stylistId, stylistId),
        sql`(${clients.firstName} ILIKE ${searchPattern} OR ${clients.lastName} ILIKE ${searchPattern} OR ${clients.email} ILIKE ${searchPattern} OR ${clients.phone} ILIKE ${searchPattern})`
      );
    }

    // Get items with pagination
    const items = await db
      .select()
      .from(clients)
      .where(whereCondition)
      .orderBy(asc(clients.firstName), asc(clients.lastName))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(clients)
      .where(whereCondition);
    
    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async getClient(id: string, stylistId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(
      and(eq(clients.id, id), eq(clients.stylistId, stylistId))
    );
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, stylistId: string, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.stylistId, stylistId)))
      .returning();
    
    if (!client) {
      throw new Error(`No client found with id ${id} for stylist ${stylistId}`);
    }
    
    return client;
  }

  async deleteClient(id: string, stylistId: string): Promise<void> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.stylistId, stylistId)))
      .returning({ id: clients.id });
    
    if (result.length === 0) {
      throw new Error(`No client found with id ${id} for stylist ${stylistId}`);
    }
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

  async getAppointmentsByStylistPaginated(stylistId: string, params: PaginationParams, date?: string): Promise<PaginatedResponse<Appointment>> {
    const { page: rawPage, pageSize: rawPageSize, q } = params;
    const page = Math.max(1, rawPage);
    const pageSize = Math.min(Math.max(1, rawPageSize), 100); // Cap at 100
    const offset = (page - 1) * pageSize;

    // Build where condition
    let whereCondition = eq(appointments.stylistId, stylistId);
    if (date) {
      whereCondition = and(eq(appointments.stylistId, stylistId), eq(appointments.date, date));
    }
    if (q && q.trim()) {
      const baseCondition = date 
        ? and(eq(appointments.stylistId, stylistId), eq(appointments.date, date))
        : eq(appointments.stylistId, stylistId);
      whereCondition = and(
        baseCondition,
        ilike(appointments.status, `%${q.trim()}%`)
      );
    }

    // Get items with pagination
    const items = await db
      .select()
      .from(appointments)
      .where(whereCondition)
      .orderBy(asc(appointments.date), asc(appointments.startTime))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(appointments)
      .where(whereCondition);
    
    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async getAppointmentsWithDetails(stylistId: string, date?: string): Promise<any[]> {
    const baseQuery = db
      .select({
        id: appointments.id,
        stylistId: appointments.stylistId,
        clientId: appointments.clientId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        totalPrice: appointments.totalPrice,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
        },
        service: {
          id: stylistServices.id,
          serviceName: stylistServices.serviceName,
          price: stylistServices.price,
        },
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(stylistServices, eq(appointments.serviceId, stylistServices.id));

    const result = date 
      ? await baseQuery.where(and(
          eq(appointments.stylistId, stylistId), 
          eq(appointments.date, date),
          eq(clients.stylistId, stylistId),
          eq(stylistServices.stylistId, stylistId)
        )).orderBy(appointments.startTime)
      : await baseQuery.where(and(
          eq(appointments.stylistId, stylistId),
          eq(clients.stylistId, stylistId),
          eq(stylistServices.stylistId, stylistId)
        )).orderBy(appointments.startTime);

    // Transform the result to include full name
    return result.map(row => ({
      ...row,
      client: {
        ...row.client,
        name: `${row.client.firstName} ${row.client.lastName}`.trim(),
      },
    }));
  }

  async getAppointment(id: string, stylistId: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(
      and(eq(appointments.id, id), eq(appointments.stylistId, stylistId))
    );
    return appointment || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    // Validate that client and service belong to the same stylist for security
    const client = await this.getClient(appointment.clientId, appointment.stylistId);
    if (!client) {
      throw new Error(`Client ${appointment.clientId} not found or does not belong to stylist ${appointment.stylistId}`);
    }

    const [service] = await db.select().from(stylistServices)
      .where(and(eq(stylistServices.id, appointment.serviceId), eq(stylistServices.stylistId, appointment.stylistId)));
    if (!service) {
      throw new Error(`Service ${appointment.serviceId} not found or does not belong to stylist ${appointment.stylistId}`);
    }

    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: string, stylistId: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    // Validate that any updated client and service belong to the same stylist for security
    if (updates.clientId) {
      const client = await this.getClient(updates.clientId, stylistId);
      if (!client) {
        throw new Error(`Client ${updates.clientId} not found or does not belong to stylist ${stylistId}`);
      }
    }

    if (updates.serviceId) {
      const [service] = await db.select().from(stylistServices)
        .where(and(eq(stylistServices.id, updates.serviceId), eq(stylistServices.stylistId, stylistId)));
      if (!service) {
        throw new Error(`Service ${updates.serviceId} not found or does not belong to stylist ${stylistId}`);
      }
    }

    const [updatedAppointment] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.stylistId, stylistId)))
      .returning();
    
    if (!updatedAppointment) {
      throw new Error(`No appointment found with id ${id} for stylist ${stylistId}`);
    }
    
    return updatedAppointment;
  }

  async deleteAppointment(id: string, stylistId: string): Promise<void> {
    const result = await db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.stylistId, stylistId)))
      .returning({ id: appointments.id });
    
    if (result.length === 0) {
      throw new Error(`No appointment found with id ${id} for stylist ${stylistId}`);
    }
  }

  // Slot management methods
  async getAvailableSlots(stylistId: string, date: string): Promise<string[]> {
    // Get stylist availability for the date
    const availability = await this.getStylistAvailability(stylistId, date);
    
    if (!availability || !availability.isOpen || !availability.timeRanges || availability.timeRanges.length === 0) {
      return [];
    }
    
    // Generate all possible 30-minute slots from time ranges
    const allSlots = generate30MinuteSlots(availability.timeRanges);
    
    // Get booked slots for this date
    const bookedAppointments = await this.getAppointmentsByStylist(stylistId, date);
    const bookedSlots = bookedAppointments
      .filter(app => app.status === 'confirmed')
      .map(app => app.startTime);
    
    // Filter out booked slots
    let availableSlots = filterAvailableSlots(allSlots, bookedSlots);
    
    // Only filter past times if date is today (use local time)
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
    if (date === today) {
      const now = new Date();
      availableSlots = availableSlots.filter(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime > now;
      });
    }
    
    return availableSlots;
  }

  async getSlotsCount(stylistId: string, date: string): Promise<{ total: number; available: number }> {
    // Get stylist availability for the date
    const availability = await this.getStylistAvailability(stylistId, date);
    
    if (!availability || !availability.isOpen || !availability.timeRanges || availability.timeRanges.length === 0) {
      return { total: 0, available: 0 };
    }
    
    // Generate all possible 30-minute slots from time ranges
    const allSlots = generate30MinuteSlots(availability.timeRanges);
    const totalSlots = allSlots.length; // Always all slots, never filter past times from total
    
    // Get booked slots for this date
    const bookedAppointments = await this.getAppointmentsByStylist(stylistId, date);
    const bookedSlots = bookedAppointments
      .filter(app => app.status === 'confirmed')
      .map(app => app.startTime);
    
    // Filter out booked slots
    let availableSlots = filterAvailableSlots(allSlots, bookedSlots);
    
    // Only filter past times from available count if date is today (use local time)
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
    if (date === today) {
      const now = new Date();
      availableSlots = availableSlots.filter(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime > now;
      });
    }
    
    return {
      total: totalSlots,
      available: availableSlots.length
    };
  }

  // Coupon management methods
  async getCouponsByStylist(stylistId: string): Promise<Coupon[]> {
    return await db.select().from(coupons).where(eq(coupons.stylistId, stylistId));
  }

  async getCouponsByStylistPaginated(stylistId: string, params: PaginationParams): Promise<PaginatedResponse<Coupon>> {
    const { page: rawPage, pageSize: rawPageSize, q } = params;
    const page = Math.max(1, rawPage);
    const pageSize = Math.min(Math.max(1, rawPageSize), 100); // Cap at 100
    const offset = (page - 1) * pageSize;

    // Build where condition
    let whereCondition = eq(coupons.stylistId, stylistId);
    if (q && q.trim()) {
      const searchPattern = `%${q.trim()}%`;
      whereCondition = and(
        eq(coupons.stylistId, stylistId),
        sql`(${coupons.title} ILIKE ${searchPattern} OR ${coupons.description} ILIKE ${searchPattern})`
      );
    }

    // Get items with pagination
    const items = await db
      .select()
      .from(coupons)
      .where(whereCondition)
      .orderBy(desc(coupons.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(coupons)
      .where(whereCondition);
    
    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async getCoupon(id: string, stylistId: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(
      and(eq(coupons.id, id), eq(coupons.stylistId, stylistId))
    );
    return coupon || undefined;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db.insert(coupons).values(coupon).returning();
    return newCoupon;
  }

  async updateCoupon(id: string, stylistId: string, updates: Omit<Partial<InsertCoupon>, 'stylistId'>): Promise<Coupon> {
    const [updatedCoupon] = await db
      .update(coupons)
      .set(updates)
      .where(and(eq(coupons.id, id), eq(coupons.stylistId, stylistId)))
      .returning();
    
    if (!updatedCoupon) {
      throw new Error(`No coupon found with id ${id} for stylist ${stylistId}`);
    }
    
    return updatedCoupon;
  }

  async deleteCoupon(id: string, stylistId: string): Promise<void> {
    const result = await db
      .delete(coupons)
      .where(and(eq(coupons.id, id), eq(coupons.stylistId, stylistId)))
      .returning({ id: coupons.id });
    
    if (result.length === 0) {
      throw new Error(`No coupon found with id ${id} for stylist ${stylistId}`);
    }
  }

  async getActiveCouponsCount(stylistId: string): Promise<number> {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
    const activeCoupons = await db.select().from(coupons).where(
      and(
        eq(coupons.stylistId, stylistId),
        // Active coupons: startDate <= today <= endDate
        sql`${coupons.startDate} <= ${today}`,
        sql`${coupons.endDate} >= ${today}`
      )
    );
    return activeCoupons.length;
  }

  // Coupon delivery management methods
  async getCouponDeliveries(couponId: string, req: Request): Promise<CouponDelivery[]> {
    const stylistId = getTenant(req);
    
    // Query with tenant filtering - join with coupons to filter by stylistId
    const query = db
      .select({
        id: couponDeliveries.id,
        couponId: couponDeliveries.couponId,
        recipientType: couponDeliveries.recipientType,
        clientIds: couponDeliveries.clientIds,
        logicRule: couponDeliveries.logicRule,
        message: couponDeliveries.message,
        subject: couponDeliveries.subject,
        emailStatus: couponDeliveries.emailStatus,
        emailId: couponDeliveries.emailId,
        emailError: couponDeliveries.emailError,
        deliveredAt: couponDeliveries.deliveredAt,
        scheduledAt: couponDeliveries.scheduledAt,
        sentAt: couponDeliveries.sentAt,
        createdAt: couponDeliveries.createdAt,
      })
      .from(couponDeliveries)
      .innerJoin(coupons, eq(couponDeliveries.couponId, coupons.id))
      .where(and(eq(coupons.id, couponId), eq(coupons.stylistId, stylistId)));
    
    return await query;
  }

  async createCouponDelivery(delivery: InsertCouponDelivery, req: Request): Promise<CouponDelivery> {
    const stylistId = getTenant(req);
    
    // CRITICAL SECURITY: Validate that the coupon belongs to the requesting stylist
    const coupon = await this.getCoupon(delivery.couponId, stylistId);
    if (!coupon) {
      throw new Error(`Coupon ${delivery.couponId} not found or does not belong to stylist ${stylistId}`);
    }

    // Check for duplicate client IDs before inserting
    if (delivery.clientIds && delivery.clientIds.length > 0) {
      // Query existing deliveries for the same coupon with tenant filtering
      const existingDeliveries = await db
        .select({
          id: couponDeliveries.id,
          clientIds: couponDeliveries.clientIds,
        })
        .from(couponDeliveries)
        .innerJoin(coupons, eq(couponDeliveries.couponId, coupons.id))
        .where(and(eq(coupons.id, delivery.couponId), eq(coupons.stylistId, stylistId)));

      // Check if any client ID in the new delivery already exists in previous deliveries
      const newClientIds = delivery.clientIds;
      for (const existingDelivery of existingDeliveries) {
        const existingClientIds = existingDelivery.clientIds as string[] || [];
        for (const newClientId of newClientIds) {
          if (existingClientIds.includes(newClientId)) {
            throw new Error(`Client ${newClientId} has already received this coupon. Duplicate deliveries are not allowed.`);
          }
        }
      }
    }

    // First create the delivery record
    const [newDelivery] = await db.insert(couponDeliveries).values(delivery).returning();
    
    // Now send email messages to the targeted recipients
    await this.processEmailDelivery(newDelivery, req);
    
    // Return the updated delivery record with current email status
    const [updatedDelivery] = await db.select().from(couponDeliveries).where(eq(couponDeliveries.id, newDelivery.id));
    return updatedDelivery || newDelivery;
  }

  private async processEmailDelivery(delivery: CouponDelivery, req: Request): Promise<void> {
    const stylistId = getTenant(req);
    try {
      const resendEmailService = getResendEmailService();
      
      // Get the coupon details for the message with tenant filtering
      const couponQuery = db.select().from(coupons).where(and(eq(coupons.id, delivery.couponId), eq(coupons.stylistId, stylistId)));
      
      const [couponResult] = await couponQuery;
      const coupon = couponResult;
      
      if (!coupon) {
        throw new Error(`Coupon not found: ${delivery.couponId}`);
      }
      
      // DEFENSIVE SECURITY: Ensure coupon belongs to expected stylist
      if (coupon.stylistId !== stylistId) {
        throw new Error(`Coupon ${delivery.couponId} does not belong to stylist ${stylistId}`);
      }
      
      // Validate coupon is active and valid
      if (!isCouponActive(coupon)) {
        throw new Error(`Cannot send expired or inactive coupon: ${delivery.couponId}`);
      }

      // Get recipient clients based on targeting type
      const recipients = await this.getDeliveryRecipients(delivery, coupon.stylistId);
      
      // Handle case with zero recipients
      if (recipients.length === 0) {
        await db.update(couponDeliveries)
          .set({
            emailStatus: 'no_recipients',
            emailError: 'No recipients found for delivery',
            sentAt: new Date(),
          })
          .where(eq(couponDeliveries.id, delivery.id));
        return;
      }
      
      // Filter to only clients with valid email addresses
      const recipientsWithEmail = recipients.filter(client => client.email && client.email.trim());
      
      if (recipientsWithEmail.length === 0) {
        await db.update(couponDeliveries)
          .set({
            emailStatus: 'no_valid_emails',
            emailError: 'No recipients with valid email addresses',
            sentAt: new Date(),
          })
          .where(eq(couponDeliveries.id, delivery.id));
        return;
      }
      
      // Track aggregate results
      let sentCount = 0;
      let failCount = 0;
      let errors: string[] = [];
      
      // Send emails with limited concurrency to avoid rate limits
      const concurrency = 5; // Limit concurrent email sends
      for (let i = 0; i < recipientsWithEmail.length; i += concurrency) {
        const batch = recipientsWithEmail.slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (client) => {
          try {
            const emailResult = await resendEmailService.sendCouponEmail(
              client.email!,
              delivery.subject, // Use subject from delivery form
              coupon.name, // Use coupon name as code
              delivery.message,
              new Date(coupon.endDate),
              'Your Stylist' // TODO: Get business name from stylist profile
            );
            
            if (emailResult.success) {
              sentCount++;
              console.log(`Email sent to ${client.firstName} ${client.lastName}: Success`);
            } else {
              failCount++;
              errors.push(`${client.firstName} ${client.lastName}: ${emailResult.error}`);
              console.error(`Email failed to ${client.firstName} ${client.lastName}: ${emailResult.error}`);
            }
            
            return emailResult;
          } catch (error: any) {
            failCount++;
            const errorMsg = `${client.firstName} ${client.lastName}: ${error.message || 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`Failed to send email to ${client.firstName} ${client.lastName}:`, error);
            return { success: false, error: errorMsg };
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to respect rate limits
        if (i + concurrency < recipientsWithEmail.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Update delivery with aggregate results
      const totalRecipients = recipientsWithEmail.length;
      let finalStatus: string;
      let finalError: string | undefined;
      
      if (sentCount === totalRecipients) {
        finalStatus = 'sent';
      } else if (sentCount === 0) {
        finalStatus = 'failed';
        finalError = errors.join('; ');
      } else {
        finalStatus = 'partial_success';
        finalError = `${sentCount}/${totalRecipients} sent successfully. Errors: ${errors.join('; ')}`;
      }
      
      await db.update(couponDeliveries)
        .set({
          emailStatus: finalStatus,
          emailError: finalError,
          sentAt: new Date(),
        })
        .where(eq(couponDeliveries.id, delivery.id));
      
      console.log(`Email delivery completed: ${sentCount} sent, ${failCount} failed out of ${totalRecipients} recipients`);
      
    } catch (error: any) {
      console.error('Error processing email delivery:', error);
      
      // Update delivery with general error
      await db.update(couponDeliveries)
        .set({
          emailStatus: 'failed',
          emailError: `Delivery processing failed: ${error.message || 'Unknown error'}`,
          sentAt: new Date(),
        })
        .where(eq(couponDeliveries.id, delivery.id));
    }
  }

  private async getDeliveryRecipients(delivery: CouponDelivery, stylistId: string): Promise<Client[]> {
    switch (delivery.recipientType) {
      case 'all':
        return await this.getClientsByStylist(stylistId);
        
      case 'custom':
        if (!delivery.clientIds || delivery.clientIds.length === 0) {
          throw new Error('Custom targeting requires client IDs');
        }
        
        const customClients = await Promise.all(
          delivery.clientIds.map(async (clientId) => {
            const client = await this.getClient(clientId, stylistId);
            if (!client) {
              console.warn(`Client not found: ${clientId}`);
              return null;
            }
            // Verify client belongs to the stylist for security
            if (client.stylistId !== stylistId) {
              console.warn(`Client ${clientId} does not belong to stylist ${stylistId}`);
              return null;
            }
            return client;
          })
        );
        
        return customClients.filter((client): client is Client => client !== null);
        
      case 'logic':
        if (!delivery.logicRule) {
          throw new Error('Logic targeting requires a rule');
        }
        
        return await this.getLogicBasedClients(stylistId, delivery.logicRule);
        
      default:
        throw new Error(`Unknown recipient type: ${delivery.recipientType}`);
    }
  }

  private async getLogicBasedClients(stylistId: string, logicRule: string): Promise<Client[]> {
    const allClients = await this.getClientsByStylist(stylistId);
    
    const filteredClients = await Promise.all(
      allClients.map(async (client) => {
        const visitCount = await this.getClientVisitCount(stylistId, client.id);
        
        switch (logicRule) {
          case 'first_time':
            return visitCount === 0 ? client : null;
            
          case 'after_2_visits':
            return visitCount >= 2 ? client : null;
            
          default:
            console.warn(`Unknown logic rule: ${logicRule}`);
            return null;
        }
      })
    );
    
    return filteredClients.filter((client): client is Client => client !== null);
  }

  async updateCouponDelivery(id: string, req: Request, updates: { sentAt?: Date }): Promise<CouponDelivery> {
    const stylistId = getTenant(req);
    
    // SECURITY: Ensure the coupon delivery belongs to the stylist's coupon
    // First get the delivery and validate ownership through the coupon
    const [delivery] = await db
      .select({
        id: couponDeliveries.id,
        couponId: couponDeliveries.couponId,
        recipientType: couponDeliveries.recipientType,
        clientIds: couponDeliveries.clientIds,
        logicRule: couponDeliveries.logicRule,
        scheduledAt: couponDeliveries.scheduledAt,
        sentAt: couponDeliveries.sentAt,
        createdAt: couponDeliveries.createdAt,
        stylistId: coupons.stylistId
      })
      .from(couponDeliveries)
      .innerJoin(coupons, eq(couponDeliveries.couponId, coupons.id))
      .where(and(eq(couponDeliveries.id, id), eq(coupons.stylistId, stylistId)));
    
    if (!delivery) {
      throw new Error(`No coupon delivery found with id ${id} for stylist ${stylistId}`);
    }
    
    const [updatedDelivery] = await db
      .update(couponDeliveries)
      .set(updates)
      .where(eq(couponDeliveries.id, id))
      .returning();
    
    return updatedDelivery;
  }

  async getClientVisitCount(stylistId: string, clientId: string): Promise<number> {
    const completedAppointments = await db.select().from(appointments).where(
      and(
        eq(appointments.stylistId, stylistId),
        eq(appointments.clientId, clientId),
        eq(appointments.status, 'completed')
      )
    );
    return completedAppointments.length;
  }

  // AI Analytics methods
  async getClientsLastVisit(stylistId: string): Promise<{ clientId: string; fullName: string; lastVisitDate: string | null; daysSince: number | null; totalVisits: number }[]> {
    // Get all clients for the stylist
    const stylistClients = await this.getClientsByStylist(stylistId);
    
    const results = await Promise.all(
      stylistClients.map(async (client) => {
        // Get all completed appointments for this client
        const completedAppointments = await db.select({
          date: appointments.date,
          createdAt: appointments.createdAt
        }).from(appointments).where(
          and(
            eq(appointments.stylistId, stylistId),
            eq(appointments.clientId, client.id),
            eq(appointments.status, 'completed')
          )
        ).orderBy(sql`${appointments.date} DESC, ${appointments.createdAt} DESC`);
        
        const totalVisits = completedAppointments.length;
        let lastVisitDate: string | null = null;
        let daysSince: number | null = null;
        
        if (completedAppointments.length > 0) {
          lastVisitDate = completedAppointments[0].date;
          const today = new Date();
          const lastVisit = new Date(lastVisitDate);
          daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        return {
          clientId: client.id,
          fullName: `${client.firstName} ${client.lastName}`.trim(),
          lastVisitDate,
          daysSince,
          totalVisits
        };
      })
    );
    
    return results;
  }

  async getInactiveClients(stylistId: string, weeks: number = 4, optInOnly: boolean = false): Promise<{ clientId: string; fullName: string; email: string | null; daysSinceLastVisit: number | null; totalVisits: number }[]> {
    // Get all clients with last visit data
    const allClientsLastVisit = await this.getClientsLastVisit(stylistId);
    
    // Calculate cutoff date for inactive clients
    const cutoffDays = weeks * 7;
    
    // Filter inactive clients
    const inactiveClients = allClientsLastVisit.filter(client => {
      // If client has never visited, they are inactive
      if (client.daysSince === null) {
        return true;
      }
      
      // Check if client is inactive (last visit was more than cutoff days ago)
      return client.daysSince > cutoffDays;
    });
    
    // If optInOnly is true, filter to only clients who opted in for marketing
    if (optInOnly) {
      // Get client details to check opt-in status
      const clientsWithOptIn = await Promise.all(
        inactiveClients.map(async (clientData) => {
          const client = await this.getClient(clientData.clientId, stylistId);
          if (client && client.optInMarketing) {
            return {
              clientId: clientData.clientId,
              fullName: clientData.fullName,
              email: client.email,
              daysSinceLastVisit: clientData.daysSince,
              totalVisits: clientData.totalVisits
            };
          }
          return null;
        })
      );
      
      return clientsWithOptIn.filter((client): client is NonNullable<typeof client> => client !== null);
    }
    
    // For all clients, get their email addresses
    const clientsWithEmail = await Promise.all(
      inactiveClients.map(async (clientData) => {
        const client = await this.getClient(clientData.clientId, stylistId);
        return {
          clientId: clientData.clientId,
          fullName: clientData.fullName,
          email: client?.email || null,
          daysSinceLastVisit: clientData.daysSince,
          totalVisits: clientData.totalVisits
        };
      })
    );
    
    return clientsWithEmail;
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

  // Notification management methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotifications(stylistId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.stylistId, stylistId));
  }

  /**
   * Get all stylists who have pending notifications ready to be sent
   */
  async getStylistsWithPendingNotifications(): Promise<{ stylistId: string }[]> {
    const now = new Date();
    
    return await db
      .select({ stylistId: notifications.stylistId })
      .from(notifications)
      .where(
        and(
          eq(notifications.status, 'pending'),
          sql`${notifications.scheduledAt} <= ${now}`
        )
      )
      .groupBy(notifications.stylistId);
  }

  /**
   * Atomically claim pending notifications for a specific stylist
   * This method uses SELECT FOR UPDATE SKIP LOCKED for safe concurrency
   * 🔒 SECURITY: Now properly scoped by stylistId to prevent cross-tenant data leakage
   */
  async claimPendingNotifications(stylistId: string, limit: number = 50): Promise<(Notification & { clientEmail: string | null; stylistFirstName: string | null; stylistLastName: string | null })[]> {
    const now = new Date();
    
    // Use a transaction to atomically claim notifications
    return await db.transaction(async (tx) => {
      // First, find notifications ready to process using FOR UPDATE SKIP LOCKED
      // 🔒 CRITICAL: Added stylistId filter for proper tenant isolation
      const notificationIds = await tx
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.status, 'pending'),
            sql`${notifications.scheduledAt} <= ${now}`,
            eq(notifications.stylistId, stylistId)
          )
        )
        .orderBy(notifications.scheduledAt)
        .limit(limit)
        .for('update', { skipLocked: true });
      
      if (notificationIds.length === 0) {
        return [];
      }
      
      const ids = notificationIds.map(n => n.id);
      
      // Mark them as processing
      await tx
        .update(notifications)
        .set({ 
          status: 'processing',
          sentAt: new Date() // Track when processing started
        })
        .where(sql`${notifications.id} = ANY(${ids})`);
      
      // Return the claimed notifications with full details
      const claimedNotifications = await tx
        .select({
          id: notifications.id,
          stylistId: notifications.stylistId,
          clientId: notifications.clientId,
          type: notifications.type,
          subject: notifications.subject,
          message: notifications.message,
          scheduledAt: notifications.scheduledAt,
          sentAt: notifications.sentAt,
          status: notifications.status,
          errorMessage: notifications.errorMessage,
          createdAt: notifications.createdAt,
          clientEmail: clients.email,
          stylistFirstName: stylists.firstName,
          stylistLastName: stylists.lastName,
        })
        .from(notifications)
        .leftJoin(clients, eq(notifications.clientId, clients.id))
        .leftJoin(stylists, eq(notifications.stylistId, stylists.id))
        .where(sql`${notifications.id} = ANY(${ids})`);
      
      return claimedNotifications;
    });
  }

  async updateNotificationStatus(id: string, req: Request, status: 'sent' | 'failed' | 'processing', errorMessage?: string): Promise<void> {
    const stylistId = getTenant(req);
    
    const updateData: any = { 
      status,
      errorMessage: errorMessage || null
    };
    
    // Only update sentAt for final statuses (sent/failed), not for processing
    if (status === 'sent' || status === 'failed') {
      updateData.sentAt = new Date();
    }
    
    // CRITICAL SECURITY: Only update notifications that belong to the requesting stylist
    const result = await db.update(notifications)
      .set(updateData)
      .where(and(eq(notifications.id, id), eq(notifications.stylistId, stylistId)))
      .returning({ id: notifications.id });
    
    if (result.length === 0) {
      throw new Error(`No notification found with id ${id} for stylist ${stylistId}`);
    }
  }

  // Analytics methods
  async getAnalytics(stylistId: string, period: 'week' | 'month'): Promise<{
    appointmentCount: number;
    revenue: number;
    topServices: { serviceName: string; count: number; revenue: number }[];
    busyDays: { date: string; appointmentCount: number }[];
    loyalClients: { clientId: string; fullName: string; totalVisits: number }[];
  }> {
    const daysBack = period === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get appointment count and revenue
    const appointmentStats = await db
      .select({
        count: sql<number>`count(*)`,
        revenue: sql<number>`sum(${appointments.totalPrice})`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.stylistId, stylistId),
          eq(appointments.status, 'completed'),
          sql`${appointments.date} >= ${startDateStr}`
        )
      );

    // Get top services
    const topServices = await db
      .select({
        serviceName: stylistServices.serviceName,
        count: sql<number>`count(*)`,
        revenue: sql<number>`sum(${appointments.totalPrice})`
      })
      .from(appointments)
      .innerJoin(stylistServices, eq(appointments.serviceId, stylistServices.id))
      .where(
        and(
          eq(appointments.stylistId, stylistId),
          eq(appointments.status, 'completed'),
          sql`${appointments.date} >= ${startDateStr}`
        )
      )
      .groupBy(stylistServices.serviceName)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    // Get busy days
    const busyDays = await db
      .select({
        date: appointments.date,
        appointmentCount: sql<number>`count(*)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.stylistId, stylistId),
          sql`${appointments.date} >= ${startDateStr}`
        )
      )
      .groupBy(appointments.date)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // Get loyal clients (clients with the most visits in the period)
    const loyalClients = await db
      .select({
        clientId: clients.id,
        fullName: sql<string>`COALESCE(${clients.firstName} || ' ' || ${clients.lastName}, ${clients.firstName}, ${clients.lastName}, 'Unknown')`,
        totalVisits: sql<number>`count(*)`
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .where(
        and(
          eq(appointments.stylistId, stylistId),
          eq(appointments.status, 'completed'),
          sql`${appointments.date} >= ${startDateStr}`
        )
      )
      .groupBy(clients.id, clients.firstName, clients.lastName)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return {
      appointmentCount: appointmentStats[0]?.count || 0,
      revenue: Number(appointmentStats[0]?.revenue || 0),
      topServices: topServices.map(s => ({
        serviceName: s.serviceName,
        count: s.count,
        revenue: Number(s.revenue)
      })),
      busyDays: busyDays.map(d => ({
        date: d.date,
        appointmentCount: d.appointmentCount
      })),
      loyalClients: loyalClients.map(c => ({
        clientId: c.clientId,
        fullName: c.fullName,
        totalVisits: c.totalVisits
      }))
    };
  }

  // Slot suggestion methods
  async getSuggestedSlots(stylistId: string, serviceId: number, days: number): Promise<{
    date: string;
    slots: string[];
  }[]> {
    const results = [];
    const service = await db.select().from(stylistServices)
      .where(and(eq(stylistServices.id, serviceId), eq(stylistServices.stylistId, stylistId)))
      .limit(1);
    
    if (!service.length) return [];

    const durationMinutes = service[0].durationMinutes || 30;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const slots = await this.getAvailableSlots(stylistId, dateStr);
      const filteredSlots = slots.filter((slot, index) => {
        // Check if the service duration fits
        const slotMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
        const endSlotMinutes = slotMinutes + durationMinutes;
        const endHour = Math.floor(endSlotMinutes / 60);
        const endMin = endSlotMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        // Check if there are enough consecutive slots
        const neededSlots = Math.ceil(durationMinutes / 30);
        for (let j = 0; j < neededSlots; j++) {
          if (!slots[index + j]) return false;
        }
        return true;
      });
      
      results.push({
        date: dateStr,
        slots: filteredSlots.slice(0, 5) // Limit to top 5 suggestions per day
      });
    }
    
    return results;
  }
}

export const storage = new DatabaseStorage();
