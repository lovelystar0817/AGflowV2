import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Check if Redis is required (production/staging) or optional (development)
const isRedisRequired = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let connection: Redis | null = null;
let notificationsQueue: Queue | null = null;

// Only create Redis connection if required or explicitly enabled
if (isRedisRequired || process.env.ENABLE_REDIS === 'true') {
  console.log('Connecting to Redis URL:', redisUrl.replace(/\/\/.*@/, '//***@')); // Hide credentials in logs
  
  connection = new Redis(redisUrl, {
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 10000,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    showFriendlyErrorStack: true,
  });

  // Handle connection events
  connection.on('connect', () => {
    console.log('✅ Redis connection established successfully');
  });

  connection.on('error', (error) => {
    console.error('❌ Redis connection error:', error.message);
    if (isRedisRequired) {
      console.error('Redis is required in this environment. Please ensure Redis is running.');
    }
  });

  connection.on('close', () => {
    console.log('Redis connection closed');
  });

  // Create BullMQ Queue instance
  notificationsQueue = new Queue('notifications', { 
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 second delay
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
  
  console.log('✅ BullMQ notification queue initialized');
} else {
  console.log('⚠️  Redis disabled in development mode. Job queuing will be skipped.');
  console.log('   To enable Redis, set ENABLE_REDIS=true or start in production/staging mode.');
}

// Export connection and queue (may be null in development)
export { connection, notificationsQueue };

// Export the queue as default for convenience  
export default notificationsQueue;