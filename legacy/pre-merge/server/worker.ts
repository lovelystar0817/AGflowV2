import { Worker, Job } from 'bullmq';
import { connection, notificationsQueue } from './queue';
import { nanoid } from 'nanoid';
import { getNotificationJobService } from './notification-job';
import { storage } from './storage-instance';
import { processPromotionRules } from './promotion-automation';

const PROMOTION_JOB_NAME = 'process-promotion-rules';
const PROMOTION_JOB_ID = 'promotion-rules-nightly';
const PROMOTION_JOB_CRON = process.env.PROMOTION_RULE_CRON || '0 7 * * *';
const PROMOTION_JOB_TZ = process.env.PROMOTION_RULE_TZ || 'UTC';

async function scheduleNightlyPromotionJob(): Promise<void> {
  try {
    const repeatableJobs = await notificationsQueue.getRepeatableJobs();
    const existingJob = repeatableJobs.find((job) => job.id === PROMOTION_JOB_ID || job.name === PROMOTION_JOB_NAME);
    const needsUpdate =
      !existingJob ||
      existingJob.pattern !== PROMOTION_JOB_CRON ||
      (existingJob.tz ?? 'UTC') !== PROMOTION_JOB_TZ;

    if (existingJob && needsUpdate) {
      console.log(`Updating promotion automation schedule to cron: ${PROMOTION_JOB_CRON}, tz: ${PROMOTION_JOB_TZ}`);
      await notificationsQueue.removeRepeatableByKey(existingJob.key);
    }

    if (needsUpdate) {
      await notificationsQueue.add(
        PROMOTION_JOB_NAME,
        { scheduledAt: new Date().toISOString() },
        {
          jobId: PROMOTION_JOB_ID,
          repeat: {
            pattern: PROMOTION_JOB_CRON,
            tz: PROMOTION_JOB_TZ,
          },
        },
      );
      console.log(`Scheduled nightly promotion automation job with cron ${PROMOTION_JOB_CRON} (${PROMOTION_JOB_TZ})`);
    } else {
      console.log('Nightly promotion automation job already scheduled.');
    }
  } catch (error) {
    console.error('Failed to schedule promotion automation job:', error);
  }
}

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
      
    } else if (job.name === PROMOTION_JOB_NAME) {
      console.log(`[${requestId}] Running promotion automation job`);
      const summaries = await processPromotionRules();
      console.log(`[${requestId}] Promotion automation completed with ${summaries.length} rule(s)`);
      return { success: true, requestId, processedAt: new Date().toISOString(), summaries };
    } else {
      // Default fallback for backwards compatibility
      console.log(`[${requestId}] Processing default notification job ${job.id}`);
      await notificationService.processNotifications();
    }

    // Insert execution key to prevent duplicates
    if (job.name === 'send-follow-up') {
      const { stylistId, clientId, trigger, scheduledDate } = job.data;
      const executionKey = `${stylistId}:${clientId}:${trigger}:${scheduledDate}`;
      
      try {
        await storage.insertAiExecution({
          stylistId,
          key: executionKey
        });
        console.log(`[${requestId}] Recorded execution key: ${executionKey}`);
      } catch (error) {
        // If insertion fails due to duplicate key, that's actually expected and fine
        console.log(`[${requestId}] Execution key already exists: ${executionKey}`);
      }
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
  void scheduleNightlyPromotionJob();
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