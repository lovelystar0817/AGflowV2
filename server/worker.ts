import { Worker, Job } from 'bullmq';
import { connection } from './queue';
import { nanoid } from 'nanoid';

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

    // Simulate job processing
    // In a real application, this would contain the actual business logic
    await new Promise(resolve => setTimeout(resolve, 2000));

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