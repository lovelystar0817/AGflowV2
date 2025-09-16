import { storage } from './storage-instance';
import type { Client, StylistService, Appointment } from '@shared/schema';

/**
 * Smart client matching using fuzzy string matching
 */
export function findBestClientMatch(searchName: string, clients: Client[]): Client | null {
  if (!searchName || !clients.length) return null;
  
  const normalizedSearch = searchName.toLowerCase().trim();
  
  // Exact matches first
  for (const client of clients) {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const firstName = client.firstName.toLowerCase();
    const lastName = client.lastName.toLowerCase();
    
    if (fullName === normalizedSearch || 
        firstName === normalizedSearch || 
        lastName === normalizedSearch) {
      return client;
    }
  }
  
  // Partial matches
  for (const client of clients) {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const firstName = client.firstName.toLowerCase();
    const lastName = client.lastName.toLowerCase();
    
    if (fullName.includes(normalizedSearch) || 
        firstName.includes(normalizedSearch) || 
        lastName.includes(normalizedSearch) ||
        normalizedSearch.includes(firstName) ||
        normalizedSearch.includes(lastName)) {
      return client;
    }
  }
  
  return null;
}

/**
 * Smart service matching with fallback to default duration
 */
export function findBestServiceMatch(searchService: string, services: StylistService[]): StylistService | null {
  if (!searchService || !services.length) return null;
  
  const normalizedSearch = searchService.toLowerCase().trim();
  
  // Exact matches first
  for (const service of services) {
    if (service.serviceName.toLowerCase() === normalizedSearch) {
      return service;
    }
  }
  
  // Partial matches
  for (const service of services) {
    const serviceName = service.serviceName.toLowerCase();
    if (serviceName.includes(normalizedSearch) || normalizedSearch.includes(serviceName)) {
      return service;
    }
  }
  
  // Common service name mappings
  const serviceMap: Record<string, string[]> = {
    'haircut': ['cut', 'trim', 'hair', 'styling'],
    'color': ['coloring', 'dye', 'highlights', 'lowlights', 'tint'],
    'manicure': ['mani', 'nails', 'nail'],
    'pedicure': ['pedi', 'foot', 'feet'],
    'facial': ['face', 'skincare', 'treatment'],
    'massage': ['relaxation', 'therapy'],
    'blowout': ['blow', 'dry', 'style']
  };
  
  for (const service of services) {
    const serviceName = service.serviceName.toLowerCase();
    for (const [mainService, aliases] of Object.entries(serviceMap)) {
      if (serviceName.includes(mainService) && aliases.includes(normalizedSearch)) {
        return service;
      }
    }
  }
  
  return null;
}

/**
 * Check for appointment conflicts at a specific date/time
 */
export async function checkAppointmentConflicts(
  stylistId: string, 
  date: string, 
  startTime: string, 
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: Appointment }> {
  try {
    const appointments = await storage.getAppointmentsByStylist(stylistId, date);
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    
    for (const appointment of appointments) {
      // Skip if checking against the same appointment (for rescheduling)
      if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
        continue;
      }
      
      const appointmentStart = timeToMinutes(appointment.startTime);
      const appointmentEnd = timeToMinutes(appointment.endTime);
      
      // Check for overlap
      if (startMinutes < appointmentEnd && endMinutes > appointmentStart) {
        return { hasConflict: true, conflictingAppointment: appointment };
      }
    }
    
    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking appointment conflicts:', error);
    return { hasConflict: true }; // Fail safe
  }
}

/**
 * Check if time slot is within stylist's availability
 */
export async function checkAvailability(
  stylistId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<{ isAvailable: boolean; reason?: string }> {
  try {
    const availability = await storage.getStylistAvailability(stylistId, date);
    
    if (!availability || !availability.isOpen || !availability.timeRanges) {
      return { isAvailable: false, reason: "Stylist not available on this date" };
    }
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    
    // Check if the appointment fits within any available time range
    for (const range of availability.timeRanges) {
      const rangeStart = timeToMinutes(range.start);
      const rangeEnd = timeToMinutes(range.end);
      
      if (startMinutes >= rangeStart && endMinutes <= rangeEnd) {
        return { isAvailable: true };
      }
    }
    
    return { isAvailable: false, reason: "Time slot not within available hours" };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { isAvailable: false, reason: "Error checking availability" };
  }
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate end time given start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
}

/**
 * Validate that appointment is within business hours
 */
export function isWithinBusinessHours(
  startTime: string, 
  endTime: string, 
  businessStart: string = "09:00", 
  businessEnd: string = "18:00"
): boolean {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const businessStartMinutes = timeToMinutes(businessStart);
  const businessEndMinutes = timeToMinutes(businessEnd);
  
  return startMinutes >= businessStartMinutes && endMinutes <= businessEndMinutes;
}