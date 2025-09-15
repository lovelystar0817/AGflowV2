import twilio from 'twilio';
import { validateAndNormalizePhone } from '@shared/schema.js';

interface SMSResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  deliveredAt?: Date;
}

class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private accountSid: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !this.fromNumber) {
      throw new Error('Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
    }

    this.accountSid = accountSid;
    this.client = twilio(accountSid, authToken);
  }


  /**
   * Sends an SMS message via Twilio
   * @param toNumber - Recipient phone number (will be validated and normalized)
   * @param message - SMS message content
   * @returns Promise with SMS result containing success status, SID, and any errors
   */
  async sendSMS(toNumber: string, message: string): Promise<SMSResult> {
    try {
      // Validate and normalize phone number using shared validation
      const validNumber = validateAndNormalizePhone(toNumber);
      if (!validNumber) {
        return {
          success: false,
          error: `Invalid phone number format: ${toNumber}. Please use E.164 format (e.g., +1234567890)`
        };
      }

      // Validate message length (SMS limit is typically 1600 characters for long messages)
      if (message.length > 1600) {
        return {
          success: false,
          error: `Message too long: ${message.length} characters. SMS limit is 1600 characters.`
        };
      }

      if (!message.trim()) {
        return {
          success: false,
          error: 'Message content cannot be empty'
        };
      }

      // Send SMS via Twilio
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: validNumber,
        // Optional: Add status callback URL for delivery tracking
        // statusCallback: process.env.TWILIO_STATUS_WEBHOOK_URL
      });

      return {
        success: true,
        sid: twilioMessage.sid,
        status: twilioMessage.status,
        deliveredAt: twilioMessage.status === 'delivered' ? new Date() : undefined
      };

    } catch (error: any) {
      console.error('Twilio SMS Error:', error);
      
      // Handle specific Twilio errors
      if (error.code) {
        const errorMessages: Record<number, string> = {
          21211: 'Invalid phone number',
          21612: 'Phone number is not reachable or unable to receive SMS',
          21614: 'Phone number is not a valid mobile number',
          21408: 'Permission to send to this phone number denied',
          21610: 'Message blocked (spam filter)',
          30007: 'Message delivery failed',
          30008: 'Message delivery unknown'
        };

        const friendlyError = errorMessages[error.code] || `Twilio error ${error.code}: ${error.message}`;
        
        return {
          success: false,
          error: friendlyError
        };
      }

      // Handle other errors
      return {
        success: false,
        error: `Failed to send SMS: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Gets the status of a sent message by SID
   * @param messageSid - Twilio message SID
   * @returns Promise with message status information
   */
  async getMessageStatus(messageSid: string): Promise<{ status: string; deliveredAt?: Date; error?: string }> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      
      return {
        status: message.status,
        deliveredAt: message.status === 'delivered' && message.dateUpdated 
          ? new Date(message.dateUpdated) 
          : undefined,
        error: message.errorCode ? `Error ${message.errorCode}: ${message.errorMessage}` : undefined
      };
    } catch (error: any) {
      console.error('Error fetching message status:', error);
      return {
        status: 'unknown',
        error: `Failed to get message status: ${error.message}`
      };
    }
  }

  /**
   * Validates Twilio configuration and connectivity
   * @returns Promise with validation result
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test by fetching account info
      const account = await this.client.api.accounts(this.accountSid).fetch();
      
      if (account.status !== 'active') {
        return {
          valid: false,
          error: `Twilio account status is ${account.status}. Account must be active.`
        };
      }

      return { valid: true };
    } catch (error: any) {
      console.error('Twilio configuration validation error:', error);
      return {
        valid: false,
        error: `Twilio configuration invalid: ${error.message}`
      };
    }
  }
}

// Create singleton instance
let twilioServiceInstance: TwilioService | null = null;

export function getTwilioService(): TwilioService {
  if (!twilioServiceInstance) {
    twilioServiceInstance = new TwilioService();
  }
  return twilioServiceInstance;
}

export default TwilioService;
export type { SMSResult };