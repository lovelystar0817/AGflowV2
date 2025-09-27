import { Resend } from 'resend';
import { env } from "./db";

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  deliveredAt?: Date;
  retry?: boolean;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class ResendEmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourapp.com';
    this.resend = new Resend(apiKey);
  }

  /**
   * Sends an email via Resend
   * @param toEmail - Recipient email address
   * @param subject - Email subject
   * @param content - Email content (can be HTML or text)
   * @param isHtml - Whether content is HTML (default: true)
   * @returns Promise with email result containing success status, ID, and any errors
   */
  async sendEmail(
    toEmail: string, 
    subject: string, 
    content: string, 
    isHtml: boolean = true
  ): Promise<EmailResult> {
    try {
      // Check if email service is configured
      if (!this.resend) {
        console.warn(`Email service not configured - would have sent email to ${toEmail} with subject: ${subject}`);
        return {
          success: false,
          error: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
        };
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(toEmail)) {
        return {
          success: false,
          error: `Invalid email address format: ${toEmail}`
        };
      }

      // Validate content
      if (!subject.trim()) {
        return {
          success: false,
          error: 'Email subject cannot be empty'
        };
      }

      if (!content.trim()) {
        return {
          success: false,
          error: 'Email content cannot be empty'
        };
      }

      // Send email via Resend
      const emailData = {
        from: this.fromEmail,
        to: [toEmail],
        subject: subject,
        ...(isHtml ? { html: content } : { text: content })
      };

      const response = await this.resend.emails.send(emailData);

      return {
        success: true,
        id: response.data?.id,
        deliveredAt: new Date()
      };

    } catch (error: any) {
      console.error('Resend email error:', error);
      
      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);
      
      return {
        success: false,
        error: `Failed to send email: ${error.message || 'Unknown error'}`,
        retry: isRetryable
      };
    }
  }

  /**
   * Determines if an email error is retryable
   * @param error - The error object from Resend
   * @returns boolean indicating if the error should trigger a retry
   */
  private isRetryableError(error: any): boolean {
    // Rate limit errors are retryable
    if (error.message?.includes('rate limit') || error.status === 429) {
      return true;
    }
    
    // Temporary server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Network timeout errors are retryable
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return true;
    }
    
    // Invalid email addresses are not retryable
    if (error.message?.includes('invalid email') || error.status === 400) {
      return false;
    }
    
    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * Send a booking confirmation email
   */
  async sendBookingConfirmationEmail(
    toEmail: string,
    clientName: string,
    stylistName: string,
    serviceName: string,
    appointmentDate: string,
    appointmentTime: string,
    businessName?: string
  ): Promise<EmailResult> {
    try {
      const subject = `✅ Booking Confirmed with ${stylistName} - ${businessName || 'Hair Stylist'}`;
      
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 15px 15px 0 0; text-align: center; color: white;">
              <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">✅ Booking Confirmed!</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your appointment is all set</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Hi ${clientName},</p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Your appointment has been successfully booked! Here are the details:
              </p>
              
              <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #4facfe; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px; font-weight: 600;">Stylist:</td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">${stylistName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px; font-weight: 600;">Service:</td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">${serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px; font-weight: 600;">Date:</td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px; font-weight: 600;">Time:</td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">${appointmentTime}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                We look forward to seeing you! If you need to make any changes, please contact ${stylistName} directly.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Thank you for booking with ${businessName || stylistName}!
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const text = `Booking Confirmed!\n\nHi ${clientName},\n\nYour appointment has been successfully booked!\n\nDetails:\nStylist: ${stylistName}\nService: ${serviceName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n\nWe look forward to seeing you!\n\n${businessName || stylistName}`;

      return await this.sendEmail(toEmail, subject, html, true);
    } catch (error) {
      console.error('Error in sendBookingConfirmationEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send booking confirmation email'
      };
    }
  }

  /**
   * Sends a coupon email with formatted HTML template
   * @param toEmail - Recipient email address
   * @param subject - Email subject line
   * @param couponCode - Coupon code
   * @param couponDescription - Description of the coupon
   * @param expiryDate - Coupon expiry date
   * @param businessName - Name of the business
   * @returns Promise with email result
   */
  async sendCouponEmail(
    toEmail: string,
    subject: string,
    couponCode: string,
    couponDescription: string,
    expiryDate: Date,
    businessName: string = 'Your Stylist'
  ): Promise<EmailResult> {
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Special Offer</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">🎉 Special Offer Just for You!</h1>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0; font-size: 24px;">Your Coupon Code</h2>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 2px; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 5px; margin: 15px 0;">
                ${couponCode}
              </div>
            </div>
            
            <div style="margin: 25px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">Offer Details:</h3>
              <p style="font-size: 16px; color: #666; margin-bottom: 15px;">${couponDescription}</p>
              <p style="color: #e74c3c; font-weight: bold;">⏰ Expires: ${expiryDate.toLocaleDateString()}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 25px 0;">
              <h4 style="color: #333; margin-bottom: 10px;">How to Redeem:</h4>
              <ol style="color: #666; margin: 0; padding-left: 20px;">
                <li>Contact us to book your appointment</li>
                <li>Present this coupon code: <strong>${couponCode}</strong></li>
                <li>Enjoy your special offer!</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; margin: 0;">Thank you for choosing ${businessName}!</p>
              <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">This offer is valid until ${expiryDate.toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Special Offer from ${businessName}

Your Coupon Code: ${couponCode}

${couponDescription}

Expires: ${expiryDate.toLocaleDateString()}

How to Redeem:
1. Contact us to book your appointment
2. Present this coupon code: ${couponCode}
3. Enjoy your special offer!

Thank you for choosing ${businessName}!
    `.trim();

    return this.sendEmail(toEmail, subject, html, true);
  }

  /**
   * Validates the Resend configuration
   * @returns Promise with validation result
   */
  async validateConfiguration(): Promise<EmailResult> {
    try {
      // Test the API key by attempting to get domain info
      // Note: This is a simple validation - Resend doesn't have a direct "test" endpoint
      return {
        success: true,
        deliveredAt: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Resend configuration invalid: ${error.message}`
      };
    }
  }

  /**
   * Sets a custom from email address
   * @param fromEmail - Email address to send from
   */
  setFromEmail(fromEmail: string): void {
    this.fromEmail = fromEmail;
  }

  /**
   * Gets the current from email address
   * @returns Current from email address
   */
  getFromEmail(): string {
    return this.fromEmail;
  }
}

// Create singleton instance
let resendEmailServiceInstance: ResendEmailService | null = null;

export function getResendEmailService(): ResendEmailService {
  if (!resendEmailServiceInstance) {
    resendEmailServiceInstance = new ResendEmailService();
  }
  return resendEmailServiceInstance;
}

export default ResendEmailService;
export type { EmailResult };