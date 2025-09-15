import { validateAndNormalizePhone } from '@shared/schema.js';

interface SMSResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  deliveredAt?: Date;
}

interface SendchampSMSResponse {
  code: number;
  message: string;
  data?: {
    id: string;
    phone_number: string;
    message: string;
    sender_name: string;
    status: string;
    created_at: string;
  };
  error?: {
    message: string;
    errors?: Record<string, string[]>;
  };
}

class SendchampService {
  private apiKey: string;
  private baseUrl: string;
  private senderName: string;

  constructor() {
    this.apiKey = process.env.SENDCHAMP_API_KEY || '';
    this.baseUrl = process.env.SENDCHAMP_BASE_URL || 'https://api.sendchamp.com/api/v1';
    this.senderName = process.env.SENDCHAMP_SENDER_NAME || 'Stylist';

    if (!this.apiKey) {
      throw new Error('Missing Sendchamp configuration. Please set SENDCHAMP_API_KEY environment variable.');
    }
  }

  /**
   * Sends an SMS message via Sendchamp
   * @param toNumber - Recipient phone number (will be validated and normalized)
   * @param message - SMS message content
   * @returns Promise with SMS result containing success status, ID, and any errors
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

      // Prepare request data for Sendchamp
      const requestData = {
        to: [validNumber.replace('+', '')], // Sendchamp expects numbers without the + prefix
        message: message,
        sender_name: this.senderName,
        route: 'international'
      };

      // Send SMS via Sendchamp API
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestData)
      });

      const responseData: SendchampSMSResponse = await response.json();

      // Handle successful response
      if (response.ok && responseData.code === 200 && responseData.data) {
        return {
          success: true,
          sid: responseData.data.id,
          status: responseData.data.status,
          deliveredAt: responseData.data.status === 'delivered' ? new Date() : undefined
        };
      }

      // Handle API errors
      let errorMessage = 'Unknown error occurred';
      
      if (responseData.error) {
        if (responseData.error.errors) {
          // Handle validation errors
          const errors = Object.entries(responseData.error.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage = errors;
        } else {
          errorMessage = responseData.error.message;
        }
      } else if (responseData.message) {
        errorMessage = responseData.message;
      }

      return {
        success: false,
        error: `Sendchamp error: ${errorMessage}`
      };

    } catch (error: any) {
      console.error('Sendchamp SMS Error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error: Unable to connect to Sendchamp API'
        };
      }

      // Handle JSON parsing errors
      if (error.name === 'SyntaxError') {
        return {
          success: false,
          error: 'Invalid response from Sendchamp API'
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
   * Gets the status of a sent message by ID
   * @param messageId - Sendchamp message ID
   * @returns Promise with message status information
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; deliveredAt?: Date; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sms/${messageId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return {
          status: 'unknown',
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const responseData: SendchampSMSResponse = await response.json();
      
      if (responseData.data) {
        return {
          status: responseData.data.status,
          deliveredAt: responseData.data.status === 'delivered' 
            ? new Date(responseData.data.created_at) 
            : undefined
        };
      }

      return {
        status: 'unknown',
        error: 'No message data in response'
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
   * Validates Sendchamp configuration and connectivity
   * @returns Promise with validation result
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test API connectivity by checking wallet balance
      const response = await fetch(`${this.baseUrl}/wallet/balance`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        return { valid: true };
      }

      const responseData = await response.json();
      return {
        valid: false,
        error: `Sendchamp API validation failed: ${responseData.message || response.statusText}`
      };

    } catch (error: any) {
      console.error('Sendchamp configuration validation error:', error);
      return {
        valid: false,
        error: `Sendchamp configuration invalid: ${error.message}`
      };
    }
  }

  /**
   * Sets a custom sender name for SMS messages
   * @param senderName - Sender name (up to 11 alphanumeric characters)
   */
  setSenderName(senderName: string): void {
    if (senderName.length > 11) {
      console.warn('Sender name truncated to 11 characters:', senderName.substring(0, 11));
      this.senderName = senderName.substring(0, 11);
    } else {
      this.senderName = senderName;
    }
  }
}

// Create singleton instance
let sendchampServiceInstance: SendchampService | null = null;

export function getSendchampService(): SendchampService {
  if (!sendchampServiceInstance) {
    sendchampServiceInstance = new SendchampService();
  }
  return sendchampServiceInstance;
}

export default SendchampService;
export type { SMSResult };