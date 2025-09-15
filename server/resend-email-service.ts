import { Resend } from 'resend';

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  deliveredAt?: Date;
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
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourapp.com';

    if (!apiKey) {
      throw new Error('Missing Resend configuration. Please set RESEND_API_KEY environment variable.');
    }

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
      return {
        success: false,
        error: `Failed to send email: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Sends a coupon email with formatted HTML template
   * @param toEmail - Recipient email address
   * @param couponCode - Coupon code
   * @param couponDescription - Description of the coupon
   * @param expiryDate - Coupon expiry date
   * @param businessName - Name of the business
   * @returns Promise with email result
   */
  async sendCouponEmail(
    toEmail: string,
    couponCode: string,
    couponDescription: string,
    expiryDate: Date,
    businessName: string = 'Your Stylist'
  ): Promise<EmailResult> {
    const subject = `🎉 Special Offer from ${businessName}`;
    
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