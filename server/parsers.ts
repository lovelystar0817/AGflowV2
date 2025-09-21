import * as chrono from 'chrono-node';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import * as EmailValidator from 'email-validator';

/**
 * Parse natural language date strings into UTC ISO format
 * Handles formats like "tomorrow", "Friday 3pm", "next Monday"
 * @param input Natural language date string
 * @returns UTC ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
export function parseDate(input: string): string {
  if (!input || typeof input !== 'string') {
    return new Date().toISOString();
  }

  // Try parsing with chrono-node
  const parsed = chrono.parseDate(input);
  if (parsed && !isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Try parsing as ISO or standard date format
  const standardParsed = new Date(input);
  if (!isNaN(standardParsed.getTime())) {
    return standardParsed.toISOString();
  }

  // Fallback to current date if parsing fails
  return new Date().toISOString();
}

/**
 * Parse time with base date and return UTC ISO string
 * Handles formats like "3pm", "15:30", "2:30 PM"
 * @param input Time string to parse
 * @param baseDate Base date in ISO format or date string
 * @returns UTC ISO string combining date and time
 */
export function parseTime(input: string, baseDate: string): string {
  if (!input || typeof input !== 'string') {
    return parseDate(baseDate);
  }

  // Parse base date
  const base = new Date(baseDate);
  if (isNaN(base.getTime())) {
    return new Date().toISOString();
  }

  // Try parsing time with chrono using base date as reference
  const timeExpression = `${baseDate} ${input}`;
  const parsed = chrono.parseDate(timeExpression, base);
  
  if (parsed && !isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Try parsing just time and combine with base date
  const timeParsed = chrono.parseDate(`today ${input}`);
  if (timeParsed && !isNaN(timeParsed.getTime())) {
    const combinedDate = new Date(base);
    combinedDate.setHours(timeParsed.getHours(), timeParsed.getMinutes(), 0, 0);
    return combinedDate.toISOString();
  }

  // Fallback to base date if time parsing fails
  return base.toISOString();
}

/**
 * Parse and format phone numbers using libphonenumber-js
 * @param input Phone number string (optional)
 * @returns Formatted international phone number or undefined
 */
export function parsePhone(input?: string): string | undefined {
  if (!input || typeof input !== 'string') {
    return undefined;
  }

  try {
    // Try parsing with default US country
    const phoneNumber = parsePhoneNumberFromString(input, 'US');
    
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatInternational();
    }

    // Try parsing without default country (for international numbers)
    const internationalPhone = parsePhoneNumberFromString(input);
    if (internationalPhone && internationalPhone.isValid()) {
      return internationalPhone.formatInternational();
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Validate email addresses using email-validator
 * @param input Email string (optional)
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(input?: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  try {
    return EmailValidator.validate(input.trim());
  } catch (error) {
    return false;
  }
}

