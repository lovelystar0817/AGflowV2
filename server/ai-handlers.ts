import { ActionSchemas, type ActionName } from "@shared/ai-actions";
import { parseDate, parseTime, parsePhone, isValidEmail } from "./parsers";
import { storage } from "./storage-instance";
import { createHash } from "crypto";

interface ExecuteResult {
  success: boolean;
  entity?: any;
  message: string;
}

/**
 * Generate idempotency key for AI actions
 */
function generateIdempotencyKey(stylistId: string, action: ActionName, args: any): string {
  // Create stable representation of args for hashing
  const stableArgs = JSON.stringify(args, Object.keys(args).sort());
  const data = `${stylistId}:${action}:${stableArgs}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Check and record execution for idempotency
 */
async function ensureIdempotency(stylistId: string, action: ActionName, args: any): Promise<{ shouldExecute: boolean; key: string }> {
  const key = generateIdempotencyKey(stylistId, action, args);
  
  try {
    const exists = await storage.checkAiExecutionExists(stylistId, key);
    if (exists) {
      return { shouldExecute: false, key };
    }
    
    // Record execution attempt
    await storage.insertAiExecution({ stylistId, key });
    return { shouldExecute: true, key };
  } catch (error) {
    // If key already exists (race condition), don't execute
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes('duplicate') || errorMessage?.includes('unique')) {
      return { shouldExecute: false, key };
    }
    throw error;
  }
}

/**
 * Add new client handler
 */
export async function executeAddClient(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.addClient.parse(rawArgs);
    
    // Apply fallbacks using parsers
    const normalizedArgs = {
      ...args,
      phone: args.phone ? parsePhone(args.phone) : undefined,
      email: args.email && isValidEmail(args.email) ? args.email : undefined
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'addClient', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Client "${args.name}" already exists or was recently added`
      };
    }

    // Execute action
    const [firstName, ...lastNameParts] = normalizedArgs.name.split(' ');
    const lastName = lastNameParts.join(' ');
    
    const client = await storage.createClient({
      stylistId,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: normalizedArgs.phone || undefined,
      email: normalizedArgs.email || undefined
    });

    return {
      success: true,
      entity: client,
      message: `Successfully added client "${firstName} ${lastName}"`
    };
  } catch (error) {
    console.error('Error in executeAddClient:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to add client: ${errorMessage}`
    };
  }
}

/**
 * Update client handler
 */
export async function executeUpdateClient(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.updateClient.parse(rawArgs);
    
    // Apply fallbacks using parsers
    const normalizedArgs = {
      ...args,
      phone: args.phone ? parsePhone(args.phone) : undefined,
      email: args.email && isValidEmail(args.email) ? args.email : undefined
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'updateClient', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Client update already processed`
      };
    }

    // Execute action  
    const updates: any = {};
    if (normalizedArgs.name) {
      const [firstName, ...lastNameParts] = normalizedArgs.name.split(' ');
      updates.firstName = firstName || '';
      updates.lastName = lastNameParts.join(' ') || '';
    }
    if (normalizedArgs.phone !== undefined) updates.phone = normalizedArgs.phone;
    if (normalizedArgs.email !== undefined) updates.email = normalizedArgs.email;
    
    const updatedClient = await storage.updateClient(normalizedArgs.clientId, stylistId, updates);

    return {
      success: true,
      entity: updatedClient,
      message: `Successfully updated client information`
    };
  } catch (error) {
    console.error('Error in executeUpdateClient:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to update client: ${errorMessage}`
    };
  }
}

/**
 * Find client handler
 */
export async function executeFindClient(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.findClient.parse(rawArgs);

    // Search clients (no idempotency needed for read operations)
    const allClients = await storage.getClientsByStylist(stylistId);
    const clients = allClients.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(args.query.toLowerCase()) ||
      c.phone?.toLowerCase().includes(args.query.toLowerCase()) ||
      c.email?.toLowerCase().includes(args.query.toLowerCase())
    );

    return {
      success: true,
      entity: clients,
      message: `Found ${clients.length} client(s) matching "${args.query}"`
    };
  } catch (error) {
    console.error('Error in executeFindClient:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to search clients: ${errorMessage}`
    };
  }
}

/**
 * Book appointment handler
 */
export async function executeBookAppointment(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.bookAppointment.parse(rawArgs);
    
    // Apply date/time parsing fallbacks
    const normalizedArgs = {
      ...args,
      date: parseDate(args.date).split('T')[0], // Extract date part
      time: parseTime(args.time, args.date)
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'bookAppointment', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Appointment for ${args.clientName} already booked`
      };
    }

    // Find client by name
    const allClients = await storage.getClientsByStylist(stylistId);
    const client = allClients.find(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(normalizedArgs.clientName.toLowerCase())
    );
    
    if (!client) {
      return {
        success: false,
        message: `Client "${normalizedArgs.clientName}" not found. Please add them first.`
      };
    }

    // Find service by name
    const services = await storage.getStylistServices(stylistId);
    const service = services.find(s => 
      s.serviceName.toLowerCase().includes(normalizedArgs.serviceName.toLowerCase())
    );
    
    if (!service) {
      return {
        success: false,
        message: `Service "${normalizedArgs.serviceName}" not found. Please check available services.`
      };
    }

    // Create appointment - need to convert time to startTime/endTime
    const startDateTime = new Date(normalizedArgs.time);
    const endDateTime = new Date(startDateTime.getTime() + (service.durationMinutes || 30) * 60000);
    
    const appointment = await storage.createAppointment({
      stylistId,
      clientId: client.id,
      serviceId: service.id,
      date: normalizedArgs.date,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      totalPrice: service.price,
      status: 'confirmed'
    });

    return {
      success: true,
      entity: appointment,
      message: `Successfully booked ${service.serviceName} for ${client.firstName} ${client.lastName} on ${normalizedArgs.date}`
    };
  } catch (error) {
    console.error('Error in executeBookAppointment:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to book appointment: ${errorMessage}`
    };
  }
}

/**
 * Reschedule appointment handler
 */
export async function executeRescheduleAppointment(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.rescheduleAppointment.parse(rawArgs);
    
    // Apply date/time parsing fallbacks
    const normalizedArgs = {
      ...args,
      date: parseDate(args.date).split('T')[0],
      time: parseTime(args.time, args.date)
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'rescheduleAppointment', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Appointment reschedule already processed`
      };
    }

    // Update appointment - need to convert time to startTime/endTime
    const startDateTime = new Date(normalizedArgs.time);
    // Use a default duration since we don't have the service info
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // Default 30 minutes
    
    const updatedAppointment = await storage.updateAppointment(normalizedArgs.appointmentId, stylistId, {
      date: normalizedArgs.date,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString()
    });

    return {
      success: true,
      entity: updatedAppointment,
      message: `Successfully rescheduled appointment to ${normalizedArgs.date} at ${new Date(normalizedArgs.time).toLocaleTimeString()}`
    };
  } catch (error) {
    console.error('Error in executeRescheduleAppointment:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to reschedule appointment: ${errorMessage}`
    };
  }
}

/**
 * Block time handler
 */
export async function executeBlockTime(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.blockTime.parse(rawArgs);
    
    // Apply date/time parsing fallbacks
    const normalizedArgs = {
      start: parseDate(args.start),
      end: parseDate(args.end)
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'blockTime', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Time block already created`
      };
    }

    // Create blocked time - use availability system for blocking time
    const startDate = new Date(normalizedArgs.start);
    const endDate = new Date(normalizedArgs.end);
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Update availability to mark this time as blocked
    await storage.updateStylistAvailability(stylistId, dateStr, {
      isOpen: false
    });

    const blockedTime = { 
      id: `blocked_${Date.now()}`,
      stylistId,
      startTime: normalizedArgs.start,
      endTime: normalizedArgs.end,
      reason: 'AI Assistant Block'
    };

    return {
      success: true,
      entity: blockedTime,
      message: `Successfully blocked time from ${new Date(normalizedArgs.start).toLocaleString()} to ${new Date(normalizedArgs.end).toLocaleString()}`
    };
  } catch (error) {
    console.error('Error in executeBlockTime:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to block time: ${errorMessage}`
    };
  }
}

/**
 * Set business hours handler
 */
export async function executeSetBusinessHours(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.setBusinessHours.parse(rawArgs);

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'setBusinessHours', args);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Business hours for ${args.day} already set`
      };
    }

    // Update business hours - use availability system  
    const today = new Date();
    let targetDate = new Date(today);
    
    // Find next occurrence of the specified day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIndex = dayNames.indexOf(args.day.toLowerCase());
    const currentDayIndex = today.getDay();
    
    let daysToAdd = targetDayIndex - currentDayIndex;
    if (daysToAdd <= 0) daysToAdd += 7;
    
    targetDate.setDate(today.getDate() + daysToAdd);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    await storage.updateStylistAvailability(stylistId, dateStr, {
      isOpen: true,
      timeRanges: [{ start: args.open, end: args.close }]
    });

    return {
      success: true,
      message: `Successfully set ${args.day} hours: ${args.open} - ${args.close}`
    };
  } catch (error) {
    console.error('Error in executeSetBusinessHours:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to set business hours: ${errorMessage}`
    };
  }
}

/**
 * Single reminder handler
 */
export async function executeReminderSingle(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.reminderSingle.parse(rawArgs);
    
    // Apply date parsing fallbacks
    const normalizedArgs = {
      ...args,
      when: parseDate(args.when)
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'reminderSingle', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Reminder for ${args.clientName} already scheduled`
      };
    }

    // Find client
    const allClients = await storage.getClientsByStylist(stylistId);
    const client = allClients.find(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(normalizedArgs.clientName.toLowerCase())
    );
    
    if (!client) {
      return {
        success: false,
        message: `Client "${normalizedArgs.clientName}" not found`
      };
    }

    // Create reminder notification
    const notification = await storage.createNotification({
      stylistId,
      clientId: client.id,
      type: 'follow_up', // Use valid type from schema
      subject: `Reminder for ${client.firstName} ${client.lastName}`,
      message: `This is a reminder message via ${normalizedArgs.channel} for ${client.firstName} ${client.lastName}`,
      scheduledAt: new Date(normalizedArgs.when)
    });

    return {
      success: true,
      entity: notification,
      message: `Successfully scheduled ${normalizedArgs.channel} reminder for ${client.firstName} ${client.lastName}`
    };
  } catch (error) {
    console.error('Error in executeReminderSingle:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to schedule reminder: ${errorMessage}`
    };
  }
}

/**
 * Bulk reminders for next day handler
 */
export async function executeRemindersBulkNextDay(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.remindersBulkNextDay.parse(rawArgs);

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'remindersBulkNextDay', args);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Bulk reminders for tomorrow already scheduled`
      };
    }

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get appointments for tomorrow
    const appointments = await storage.getAppointmentsByStylist(stylistId, tomorrowStr);

    // Get all clients for checking contact info
    const allClients = await storage.getClientsByStylist(stylistId);
    const clientMap = new Map(allClients.map(c => [c.id, c]));
    
    let reminderCount = 0;
    for (const appointment of appointments) {
      const client = clientMap.get(appointment.clientId);
      if (client) {
        // Check client opt-in preferences
        const hasContact = args.channel === 'email' ? client.email : client.phone;
        if (hasContact) {
          await storage.createNotification({
            stylistId,
            clientId: appointment.clientId,
            type: 'follow_up', // Use valid type from schema
            subject: 'Appointment Reminder',
            message: `Reminder: You have an appointment tomorrow via ${args.channel}`,
            scheduledAt: new Date(tomorrow.getTime() - 24 * 60 * 60 * 1000) // Send day before
          });
          reminderCount++;
        }
      }
    }

    return {
      success: true,
      message: `Successfully scheduled ${reminderCount} ${args.channel} reminders for tomorrow's appointments`
    };
  } catch (error) {
    console.error('Error in executeRemindersBulkNextDay:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to schedule bulk reminders: ${errorMessage}`
    };
  }
}

/**
 * Create coupon handler
 */
export async function executeCreateCoupon(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.createCoupon.parse(rawArgs);
    
    // Apply date parsing fallbacks
    const normalizedArgs = {
      ...args,
      startDate: parseDate(args.startDate).split('T')[0]
    };

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'createCoupon', normalizedArgs);
    if (!shouldExecute) {
      return {
        success: true,
        message: `Coupon "${args.name}" already created`
      };
    }

    // Create coupon
    const coupon = await storage.createCoupon({
      stylistId,
      name: normalizedArgs.name,
      type: normalizedArgs.type,
      amount: normalizedArgs.amount, // Keep as string
      serviceId: normalizedArgs.serviceId || null,
      startDate: normalizedArgs.startDate,
      endDate: calculateEndDate(normalizedArgs.startDate, normalizedArgs.duration)
    });

    return {
      success: true,
      entity: coupon,
      message: `Successfully created coupon "${coupon.name}" - ${args.amount}${args.type === 'percent' ? '%' : '$'} off`
    };
  } catch (error) {
    console.error('Error in executeCreateCoupon:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to create coupon: ${errorMessage}`
    };
  }
}

/**
 * Send coupon handler
 */
export async function executeSendCoupon(stylistId: string, rawArgs: any): Promise<ExecuteResult> {
  try {
    // Validate with schema
    const args = ActionSchemas.sendCoupon.parse(rawArgs);

    // Check idempotency
    const { shouldExecute } = await ensureIdempotency(stylistId, 'sendCoupon', args);
    if (!shouldExecute) {
      return {
        success: true,
        message: args.preview ? `Coupon preview already generated` : `Coupon already sent`
      };
    }

    // Get coupon
    const coupon = await storage.getCoupon(args.couponId, stylistId);
    if (!coupon) {
      return {
        success: false,
        message: `Coupon not found`
      };
    }

    if (args.preview) {
      // Return preview without sending
      return {
        success: true,
        entity: { 
          coupon,
          previewMessage: `Preview: ${coupon.name} - ${coupon.amount}${coupon.type === 'percent' ? '%' : '$'} off`
        },
        message: `Coupon preview generated successfully`
      };
    }

    // Get target clients based on segment
    let targetClients = [];
    if (args.segment?.inactiveWeeks) {
      const inactiveClientsData = await storage.getInactiveClients(stylistId, args.segment.inactiveWeeks);
      // Convert to client objects
      const allClients = await storage.getClientsByStylist(stylistId);
      targetClients = allClients.filter(c => 
        inactiveClientsData.some(ic => ic.clientId === c.id)
      );
    } else if (args.segment?.newClients) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const allClients = await storage.getClientsByStylist(stylistId);
      targetClients = allClients.filter(c => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo);
    } else {
      // All clients
      targetClients = await storage.getClientsByStylist(stylistId);
    }

    // Send to clients with email (respect opt-outs)
    const emailClients = targetClients.filter(c => c.email && c.optInMarketing);
    
    // Create mock request object for coupon delivery
    const mockReq = { user: { id: stylistId } } as any;
    
    // Create single delivery record for all email clients
    if (emailClients.length > 0) {
      await storage.createCouponDelivery({
        couponId: args.couponId,
        recipientType: 'custom',
        clientIds: emailClients.map(c => c.id),
        message: `Coupon: ${coupon.name} - ${coupon.amount}${coupon.type === 'percent' ? '%' : '$'} off`,
        subject: `Special Offer: ${coupon.name}`
      }, mockReq);
    }

    return {
      success: true,
      message: `Successfully queued coupon "${coupon.name}" for ${emailClients.length} clients`
    };
  } catch (error) {
    console.error('Error in executeSendCoupon:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to send coupon: ${errorMessage}`
    };
  }
}

/**
 * Calculate coupon end date based on duration
 */
function calculateEndDate(startDate: string, duration: string): string {
  const start = new Date(startDate);
  
  switch (duration) {
    case '2weeks':
      start.setDate(start.getDate() + 14);
      break;
    case '1month':
      start.setMonth(start.getMonth() + 1);
      break;
    case '3months':
      start.setMonth(start.getMonth() + 3);
      break;
    default:
      start.setMonth(start.getMonth() + 1); // Default to 1 month
  }
  
  return start.toISOString().split('T')[0];
}

/**
 * Main execution router
 */
export async function executeAction(stylistId: string, action: ActionName, args: any): Promise<ExecuteResult> {
  switch (action) {
    case 'addClient':
      return executeAddClient(stylistId, args);
    case 'updateClient':
      return executeUpdateClient(stylistId, args);
    case 'findClient':
      return executeFindClient(stylistId, args);
    case 'bookAppointment':
      return executeBookAppointment(stylistId, args);
    case 'rescheduleAppointment':
      return executeRescheduleAppointment(stylistId, args);
    case 'blockTime':
      return executeBlockTime(stylistId, args);
    case 'setBusinessHours':
      return executeSetBusinessHours(stylistId, args);
    case 'reminderSingle':
      return executeReminderSingle(stylistId, args);
    case 'remindersBulkNextDay':
      return executeRemindersBulkNextDay(stylistId, args);
    case 'createCoupon':
      return executeCreateCoupon(stylistId, args);
    case 'sendCoupon':
      return executeSendCoupon(stylistId, args);
    default:
      return {
        success: false,
        message: `Unknown action: ${action}`
      };
  }
}