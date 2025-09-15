import { stylists, clients, stylistServices, stylistAvailability, appointments, coupons, couponDeliveries, type Stylist, type InsertStylist, type Client, type InsertClient, type UpdateProfile, type StylistService, type InsertStylistService, type StylistAvailability, type InsertStylistAvailability, type Appointment, type InsertAppointment, type Coupon, type InsertCoupon, type CouponDelivery, type InsertCouponDelivery, type TimeRange, generateHourlySlots, generate30MinuteSlots, filterAvailableSlots, getSlotEndTime, calculateCouponEndDate, isCouponActive } from "@shared/schema";
import { db } from "./db";
import { getSendchampService } from "./sendchamp-service";
import { eq, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getStylist(id: string): Promise<Stylist | undefined>;
  getStylistByEmail(email: string): Promise<Stylist | undefined>;
  createStylist(stylist: InsertStylist): Promise<Stylist>;
  updateStylistProfile(id: string, profile: UpdateProfile): Promise<Stylist>;
  updateBusinessSettings(id: string, settings: any): Promise<Stylist>;
  
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
  getAppointmentsWithDetails(stylistId: string, date?: string): Promise<any[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  
  // Slot management
  getAvailableSlots(stylistId: string, date: string): Promise<string[]>;
  getSlotsCount(stylistId: string, date: string): Promise<{ total: number; available: number }>;
  
  // Coupon management
  getCouponsByStylist(stylistId: string): Promise<Coupon[]>;
  getCoupon(id: string, stylistId: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, stylistId: string, updates: Omit<Partial<InsertCoupon>, 'stylistId'>): Promise<Coupon>;
  deleteCoupon(id: string, stylistId: string): Promise<void>;
  getActiveCouponsCount(stylistId: string): Promise<number>;
  
  // Coupon delivery management
  getCouponDeliveries(couponId: string, stylistId: string): Promise<CouponDelivery[]>;
  createCouponDelivery(delivery: InsertCouponDelivery): Promise<CouponDelivery>;
  updateCouponDelivery(id: string, stylistId: string, updates: { sentAt?: Date }): Promise<CouponDelivery>;
  getClientVisitCount(stylistId: string, clientId: string): Promise<number>;
  
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
      ? await baseQuery.where(and(eq(appointments.stylistId, stylistId), eq(appointments.date, date))).orderBy(appointments.startTime)
      : await baseQuery.where(eq(appointments.stylistId, stylistId)).orderBy(appointments.startTime);

    // Transform the result to include full name
    return result.map(row => ({
      ...row,
      client: {
        ...row.client,
        name: `${row.client.firstName} ${row.client.lastName}`.trim(),
      },
    }));
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
  async getCouponDeliveries(couponId: string, stylistId: string): Promise<CouponDelivery[]> {
    // First validate that the coupon belongs to the stylist
    const coupon = await this.getCoupon(couponId, stylistId);
    if (!coupon) {
      throw new Error(`No coupon found with id ${couponId} for stylist ${stylistId}`);
    }
    
    return await db.select().from(couponDeliveries).where(eq(couponDeliveries.couponId, couponId));
  }

  async createCouponDelivery(delivery: InsertCouponDelivery): Promise<CouponDelivery> {
    // First create the delivery record
    const [newDelivery] = await db.insert(couponDeliveries).values(delivery).returning();
    
    // Now send SMS messages to the targeted recipients
    await this.processSMSDelivery(newDelivery);
    
    // Return the updated delivery record with current SMS status
    const [updatedDelivery] = await db.select().from(couponDeliveries).where(eq(couponDeliveries.id, newDelivery.id));
    return updatedDelivery || newDelivery;
  }

  private async processSMSDelivery(delivery: CouponDelivery): Promise<void> {
    try {
      const sendchampService = getSendchampService();
      
      // Get the coupon details for the message
      const [couponResult] = await db.select().from(coupons).where(eq(coupons.id, delivery.couponId));
      const coupon = couponResult;
      
      if (!coupon) {
        throw new Error(`Coupon not found: ${delivery.couponId}`);
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
            smsStatus: 'no_recipients',
            smsError: 'No recipients found for delivery',
            sentAt: new Date(),
          })
          .where(eq(couponDeliveries.id, delivery.id));
        return;
      }
      
      // Filter to only clients with valid phone numbers
      const recipientsWithPhone = recipients.filter(client => client.phone && client.phone.trim());
      
      if (recipientsWithPhone.length === 0) {
        await db.update(couponDeliveries)
          .set({
            smsStatus: 'no_valid_phones',
            smsError: 'No recipients with valid phone numbers',
            sentAt: new Date(),
          })
          .where(eq(couponDeliveries.id, delivery.id));
        return;
      }
      
      // Track aggregate results
      let sentCount = 0;
      let failCount = 0;
      let errors: string[] = [];
      
      // Send SMS with limited concurrency to avoid rate limits
      const concurrency = 5; // Limit concurrent SMS sends
      for (let i = 0; i < recipientsWithPhone.length; i += concurrency) {
        const batch = recipientsWithPhone.slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (client) => {
          try {
            const smsResult = await sendchampService.sendSMS(client.phone!, delivery.message);
            
            if (smsResult.success) {
              sentCount++;
              console.log(`SMS sent to ${client.firstName} ${client.lastName}: Success`);
            } else {
              failCount++;
              errors.push(`${client.firstName} ${client.lastName}: ${smsResult.error}`);
              console.error(`SMS failed to ${client.firstName} ${client.lastName}: ${smsResult.error}`);
            }
            
            return smsResult;
          } catch (error: any) {
            failCount++;
            const errorMsg = `${client.firstName} ${client.lastName}: ${error.message || 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`Failed to send SMS to ${client.firstName} ${client.lastName}:`, error);
            return { success: false, error: errorMsg };
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to respect rate limits
        if (i + concurrency < recipientsWithPhone.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Update delivery with aggregate results
      const totalRecipients = recipientsWithPhone.length;
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
          smsStatus: finalStatus,
          smsError: finalError,
          sentAt: new Date(),
        })
        .where(eq(couponDeliveries.id, delivery.id));
      
      console.log(`SMS delivery completed: ${sentCount} sent, ${failCount} failed out of ${totalRecipients} recipients`);
      
    } catch (error: any) {
      console.error('Error processing SMS delivery:', error);
      
      // Update delivery with general error
      await db.update(couponDeliveries)
        .set({
          smsStatus: 'failed',
          smsError: `Delivery processing failed: ${error.message || 'Unknown error'}`,
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
            const client = await this.getClient(clientId);
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

  async updateCouponDelivery(id: string, stylistId: string, updates: { sentAt?: Date }): Promise<CouponDelivery> {
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
      .where(eq(couponDeliveries.id, id));
    
    if (!delivery || delivery.stylistId !== stylistId) {
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
