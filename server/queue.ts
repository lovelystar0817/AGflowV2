import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Create Redis connection with proper URL parsing
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Connecting to Redis URL:', redisUrl.replace(/\/\/.*@/, '//***@')); // Hide credentials in logs

export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 10000,
});

// Handle connection events
connection.on('connect', () => {
  console.log('Redis connection established successfully');
});

connection.on('error', (error) => {
  console.error('Redis connection error:', error.message);
});

connection.on('close', () => {
  console.log('Redis connection closed');
});

// Create BullMQ Queue instance
export const notificationsQueue = new Queue('notifications', { 
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

// Export the queue as default for convenience
export default notificationsQueue;