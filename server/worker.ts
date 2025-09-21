import { Worker, Job } from 'bullmq';
import { connection } from './queue';
import { nanoid } from 'nanoid';
import { getNotificationJobService } from './notification-job';

// Create Worker instance for "notifications" queue
export const notificationWorker = new Worker('notifications', async (job: Job) => {
  const requestId = nanoid();
  
  try {
    console.log(`[${requestId}] Processing job: ${JSON.stringify({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      timestamp: new Date().toISOString()
    })}`);

    const notificationService = getNotificationJobService();
    
    // Handle different job types
    if (job.name === 'process-notifications') {
      // Process all pending notifications
      await notificationService.processNotifications();
      console.log(`[${requestId}] Processed pending notifications for job ${job.id}`);
      
    } else if (job.name === 'send-follow-up') {
      // Handle individual follow-up notifications
      const { stylistId, clientId, trigger, scheduledDate } = job.data;
      console.log(`[${requestId}] Processing follow-up notification for stylist ${stylistId}, client ${clientId}`);
      
      // For now, trigger the general processing - in the future this could be more specific
      await notificationService.processNotifications();
      console.log(`[${requestId}] Processed follow-up notification for job ${job.id}`);
      
    } else {
      // Default fallback for backwards compatibility
      console.log(`[${requestId}] Processing default notification job ${job.id}`);
      await notificationService.processNotifications();
    }

    console.log(`[${requestId}] Job ${job.id} completed successfully`);
    
    return { success: true, requestId, processedAt: new Date().toISOString() };
  } catch (error) {
    console.error(`[${requestId}] Job ${job.id} failed:`, error);
    throw error; // Re-throw to trigger retry mechanism
  }
}, {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
});

// Handle worker events
notificationWorker.on('completed', (job: Job, result: any) => {
  console.log(`Worker completed job ${job.id} with result:`, result);
});

notificationWorker.on('failed', (job: Job | undefined, error: Error) => {
  const requestId = nanoid();
  console.error(`[${requestId}] Worker failed processing job ${job?.id}:`, {
    jobId: job?.id,
    jobName: job?.name,
    attemptsMade: job?.attemptsMade,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});

notificationWorker.on('error', (error: Error) => {
  const requestId = nanoid();
  console.error(`[${requestId}] Worker error:`, {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});

notificationWorker.on('ready', () => {
  console.log('Notification worker is ready and waiting for jobs');
});

notificationWorker.on('stalled', (jobId: string) => {
  const requestId = nanoid();
  console.warn(`[${requestId}] Job ${jobId} stalled and will be retried`);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Shutting down worker gracefully...');
  await notificationWorker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker gracefully...');
  await notificationWorker.close();
  await connection.quit();
  process.exit(0);
});

// Export for use in other modules
export default notificationWorker;