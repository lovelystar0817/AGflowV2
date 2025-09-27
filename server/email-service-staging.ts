import { Resend } from 'resend';
import { config } from './config';

/**
 * Staging-specific email service configuration
 * Uses staging domain and API keys for testing
 */

export class StagingEmailService {
  private resend: Resend;
  private emailDomain: string;

  constructor() {
    if (config.environment !== 'staging') {
      throw new Error('StagingEmailService should only be used in staging environment');
    }

    this.resend = new Resend(config.apis.resend);
    this.emailDomain = config.app.emailDomain;
    
    console.log(`📧 Staging Email Service initialized with domain: ${this.emailDomain}`);
  }

  /**
   * Send email in staging environment with staging prefix
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }) {
    const from = options.from || `noreply@${this.emailDomain}`;
    const subject = `[STAGING] ${options.subject}`;
    
    try {
      const result = await this.resend.emails.send({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject,
        html: this.wrapWithStagingBanner(options.html),
        tags: [
          { name: 'environment', value: 'staging' },
          { name: 'service', value: 'hair-stylist-platform' }
        ]
      });

      console.log(`📧 Staging email sent successfully:`, {
        id: result.data?.id,
        to: options.to,
        subject,
        from
      });

      return result;
    } catch (error) {
      console.error('📧 Staging email send failed:', error);
      throw error;
    }
  }

  /**
   * Wrap email content with staging environment banner
   */
  private wrapWithStagingBanner(html: string): string {
    const banner = `
      <div style="background-color: #fbbf24; color: #92400e; padding: 12px; text-align: center; font-weight: bold; border-radius: 8px; margin-bottom: 20px;">
        ⚠️ STAGING ENVIRONMENT - This is a test email
      </div>
    `;
    
    return `${banner}${html}`;
  }

  /**
   * Send appointment reminder email (staging version)
   */
  async sendAppointmentReminder(clientEmail: string, appointmentDetails: {
    date: string;
    time: string;
    service: string;
    stylistName: string;
  }) {
    const html = `
      <h2>Appointment Reminder</h2>
      <p>Hello! This is a reminder about your upcoming appointment.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Appointment Details:</h3>
        <p><strong>Date:</strong> ${appointmentDetails.date}</p>
        <p><strong>Time:</strong> ${appointmentDetails.time}</p>
        <p><strong>Service:</strong> ${appointmentDetails.service}</p>
        <p><strong>Stylist:</strong> ${appointmentDetails.stylistName}</p>
      </div>
      <p>Please arrive 10 minutes early for your appointment.</p>
      <p>If you need to reschedule, please contact us as soon as possible.</p>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: 'Appointment Reminder',
      html
    });
  }

  /**
   * Send welcome email for new clients (staging version)
   */
  async sendWelcomeEmail(clientEmail: string, clientName: string) {
    const html = `
      <h2>Welcome to Our Salon!</h2>
      <p>Hello ${clientName}!</p>
      <p>Welcome to our hair salon. We're excited to have you as a client!</p>
      <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
        <h3>Getting Started:</h3>
        <ul>
          <li>Book your first appointment online</li>
          <li>Complete your client profile</li>
          <li>Explore our services and styling options</li>
        </ul>
      </div>
      <p>If you have any questions, feel free to contact us!</p>
      <p>Best regards,<br>Your Styling Team</p>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: 'Welcome to Our Salon!',
      html
    });
  }
}

// Export singleton instance for staging
let stagingEmailService: StagingEmailService | null = null;

export const getStagingEmailService = (): StagingEmailService => {
  if (!stagingEmailService && config.environment === 'staging') {
    stagingEmailService = new StagingEmailService();
  }
  
  if (!stagingEmailService) {
    throw new Error('Staging email service not available in non-staging environment');
  }
  
  return stagingEmailService;
};