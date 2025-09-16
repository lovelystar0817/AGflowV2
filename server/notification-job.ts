import { storage } from "./storage-instance";
import { getResendEmailService } from "./resend-email-service";

export class NotificationJobService {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly INTERVAL_HOURS = 1; // Run every hour
  private readonly emailService = getResendEmailService();

  constructor() {
    console.log("NotificationJobService initialized");
  }

  /**
   * Start the background job that processes pending notifications every hour
   */
  start(): void {
    if (this.intervalId) {
      console.log("Notification job already running");
      return;
    }

    // Convert hours to milliseconds
    const intervalMs = this.INTERVAL_HOURS * 60 * 60 * 1000;

    console.log(`Starting notification job service - will run every ${this.INTERVAL_HOURS} hour(s)`);

    // Run immediately on start
    this.processNotifications();

    // Set up recurring job
    this.intervalId = setInterval(() => {
      this.processNotifications();
    }, intervalMs);
  }

  /**
   * Stop the background job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Notification job service stopped");
    }
  }

  /**
   * Process all pending notifications that are due to be sent
   * 🔒 SECURITY: Now processes per stylist to ensure proper tenant isolation
   */
  private async processNotifications(): Promise<void> {
    if (this.isProcessing) {
      console.log("Notification processing already in progress, skipping this run");
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log("Starting notification processing job...");

      // 🔒 CRITICAL SECURITY FIX: Get stylists with pending notifications first
      const stylistsWithNotifications = await storage.getStylistsWithPendingNotifications();

      if (stylistsWithNotifications.length === 0) {
        console.log("No pending notifications to process");
        return;
      }

      console.log(`Found notifications for ${stylistsWithNotifications.length} stylist(s)`);

      let totalSuccessCount = 0;
      let totalFailureCount = 0;

      // 🔒 SECURE: Process notifications per stylist to ensure tenant isolation
      for (const stylistData of stylistsWithNotifications) {
        const stylistId = stylistData.stylistId;
        
        try {
          // Atomically claim pending notifications for this specific stylist
          const pendingNotifications = await storage.claimPendingNotifications(stylistId, 50);

          if (pendingNotifications.length === 0) {
            continue; // Skip if no notifications for this stylist
          }

          console.log(`Processing ${pendingNotifications.length} notifications for stylistId: ${stylistId}`);

          // Process each notification for this stylist
          for (const notification of pendingNotifications) {
            try {
              await this.sendNotificationEmail(notification);
              totalSuccessCount++;
            } catch (error) {
              console.error(`Failed to process notification ${notification.id} for stylist ${stylistId}:`, error);
              totalFailureCount++;
              
              // Update notification status to failed with error message
              await storage.updateNotificationStatus(
                notification.id, 
                'failed', 
                error instanceof Error ? error.message : 'Unknown error occurred'
              );
            }
          }
        } catch (error) {
          console.error(`Error processing notifications for stylist ${stylistId}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Notification processing completed in ${duration}ms - Total Success: ${totalSuccessCount}, Total Failed: ${totalFailureCount}`);

    } catch (error) {
      console.error("Error in notification processing job:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send email for a single notification
   */
  private async sendNotificationEmail(
    notification: {
      id: string;
      subject: string;
      message: string;
      clientEmail: string | null;
      stylistFirstName: string | null;
      stylistLastName: string | null;
      type: 'thank_you' | 'follow_up' | 'rebook_prompt';
    }
  ): Promise<void> {
    // Validate that we have a client email
    if (!notification.clientEmail) {
      throw new Error(`Client email not found for notification ${notification.id}`);
    }

    // Prepare email content with business name fallback
    const businessName = notification.stylistFirstName && notification.stylistLastName 
      ? `${notification.stylistFirstName} ${notification.stylistLastName}`
      : 'Your Stylist';

    // Replace placeholders in the message if needed
    let personalizedMessage = notification.message;
    if (personalizedMessage.includes('[BUSINESS_NAME]')) {
      personalizedMessage = personalizedMessage.replace(/\[BUSINESS_NAME\]/g, businessName);
    }

    // Create HTML email content
    const htmlContent = this.createEmailHTML(
      notification.subject,
      personalizedMessage,
      businessName,
      notification.type
    );

    console.log(`Sending ${notification.type} notification email to ${notification.clientEmail}`);

    // Send the email
    const result = await this.emailService.sendEmail(
      notification.clientEmail,
      notification.subject,
      htmlContent,
      true // isHtml
    );

    if (result.success) {
      // Update notification status to sent
      await storage.updateNotificationStatus(notification.id, 'sent');
      console.log(`Successfully sent notification ${notification.id} to ${notification.clientEmail}`);
    } else {
      throw new Error(result.error || 'Failed to send email');
    }
  }

  /**
   * Create HTML email template for notifications
   */
  private createEmailHTML(
    subject: string,
    message: string,
    businessName: string,
    type: 'thank_you' | 'follow_up' | 'rebook_prompt'
  ): string {
    // Choose emoji and color scheme based on notification type
    const typeConfig = {
      thank_you: { emoji: '🙏', color: '#22c55e', title: 'Thank You!' },
      follow_up: { emoji: '💌', color: '#3b82f6', title: 'We Miss You!' },
      rebook_prompt: { emoji: '✨', color: '#8b5cf6', title: 'Time for Your Next Visit!' }
    };

    const config = typeConfig[type];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: ${config.color}; margin: 0 0 10px 0; font-size: 28px;">
                ${config.emoji} ${config.title}
              </h1>
            </div>
            
            <div style="margin: 25px 0;">
              ${message.split('\n').map(paragraph => 
                `<p style="font-size: 16px; color: #333; margin-bottom: 15px; line-height: 1.6;">${paragraph}</p>`
              ).join('')}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; margin: 0;">Best regards,</p>
              <p style="color: ${config.color}; font-weight: bold; margin: 5px 0 0 0; font-size: 18px;">${businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get the current status of the notification job
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    intervalHours: number;
  } {
    return {
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
      intervalHours: this.INTERVAL_HOURS,
    };
  }

  /**
   * Manually trigger notification processing (useful for testing)
   */
  async triggerProcessing(): Promise<void> {
    console.log("Manual notification processing triggered");
    await this.processNotifications();
  }
}

// Create singleton instance
let notificationJobServiceInstance: NotificationJobService | null = null;

export function getNotificationJobService(): NotificationJobService {
  if (!notificationJobServiceInstance) {
    notificationJobServiceInstance = new NotificationJobService();
  }
  return notificationJobServiceInstance;
}