import { storage } from "./storage-instance";
import { getResendEmailService } from "./resend-email-service";
import { notificationsQueue } from "./queue";

export class NotificationJobService {
  private isProcessing = false;
  private readonly emailService = getResendEmailService();

  constructor() {
    console.log("NotificationJobService initialized");
  }

  /**
   * Start the background job by enqueuing initial processing job
   */
  start(): void {
    console.log("Starting notification job service - processing notifications every hour");
    
    // Enqueue initial processing job
    this.enqueueProcessingJob();
  }

  /**
   * Stop the background job (no-op since we use queue now)
   */
  stop(): void {
    console.log("Notification job service stopped");
  }

  /**
   * Enqueue notification processing job with idempotency
   */
  private async enqueueProcessingJob(): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const jobId = `notification-processing:${date}:${Math.floor(Date.now() / (60 * 60 * 1000))}`; // Hour granularity
    
    try {
      // Check if job already exists to prevent duplicates
      const existingJob = await notificationsQueue.getJob(jobId);
      if (existingJob) {
        console.log(`Processing job ${jobId} already exists, skipping duplicate`);
        return;
      }

      await notificationsQueue.add('process-notifications', {
        timestamp: new Date().toISOString(),
        trigger: 'scheduled'
      }, {
        jobId,
        delay: 0,
        repeat: { every: 60 * 60 * 1000 } // Repeat every hour
      });

      console.log(`Enqueued notification processing job with ID: ${jobId}`);
    } catch (error) {
      console.error('Failed to enqueue notification processing job:', error);
    }
  }

  /**
   * Enqueue follow-up notification with idempotency
   */
  async enqueueFollowUpNotification(
    stylistId: string, 
    clientId: string, 
    trigger: string, 
    scheduledDate: string,
    notificationData: any
  ): Promise<void> {
    const jobId = `${stylistId}:${clientId}:${trigger}:${scheduledDate}`;
    
    try {
      // Check if job already exists to prevent duplicates
      const existingJob = await notificationsQueue.getJob(jobId);
      if (existingJob) {
        console.log(`Follow-up notification job ${jobId} already exists, skipping duplicate`);
        return;
      }

      await notificationsQueue.add('send-follow-up', {
        stylistId,
        clientId,
        trigger,
        scheduledDate,
        ...notificationData
      }, {
        jobId,
        delay: new Date(scheduledDate).getTime() - Date.now()
      });

      console.log(`Enqueued follow-up notification with ID: ${jobId}`);
    } catch (error) {
      console.error(`Failed to enqueue follow-up notification ${jobId}:`, error);
    }
  }

  /**
   * Process all pending notifications that are due to be sent
   * 🔒 SECURITY: Now processes per stylist to ensure proper tenant isolation
   */
  async processNotifications(): Promise<void> {
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
  } {
    return {
      isRunning: true, // Always running since we use queue
      isProcessing: this.isProcessing,
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