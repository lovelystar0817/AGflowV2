import { type Request, type Response } from 'express';
import { config } from './config';
import { db } from './db';
import { connection as redisConnection } from './queue';

/**
 * Health check endpoint for staging and production monitoring
 */
export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.environment,
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
      memory: { status: 'unknown', usage: 0, limit: 0 },
    },
    warnings: [] as string[],
    errors: [] as string[]
  };

  try {
    // Database health check
    const dbStartTime = Date.now();
    try {
      await db.execute('SELECT 1' as any);
      healthStatus.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStartTime
      };
    } catch (dbError) {
      healthStatus.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStartTime
      };
      healthStatus.errors.push(`Database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      healthStatus.status = 'unhealthy';
    }

    // Redis health check
    const redisStartTime = Date.now();
    try {
      if (!redisConnection) {
        throw new Error('Redis not connected');
      }
      await redisConnection.ping();
      healthStatus.checks.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStartTime
      };
    } catch (redisError) {
      healthStatus.checks.redis = {
        status: 'degraded',
        responseTime: Date.now() - redisStartTime
      };
      healthStatus.warnings.push(`Redis: ${redisError instanceof Error ? redisError.message : 'Unknown error'}`);
      // Redis is not critical, so only mark as degraded
      if (healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
      }
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    healthStatus.checks.memory = {
      status: memUsageMB < 500 ? 'healthy' : memUsageMB < 800 ? 'warning' : 'critical',
      usage: memUsageMB,
      limit: memLimitMB
    };

    if (memUsageMB > 800) {
      healthStatus.errors.push(`High memory usage: ${memUsageMB}MB`);
      healthStatus.status = 'unhealthy';
    } else if (memUsageMB > 500) {
      healthStatus.warnings.push(`Elevated memory usage: ${memUsageMB}MB`);
      if (healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
      }
    }

    // Add environment-specific checks
    if (config.environment === 'staging') {
      healthStatus.warnings.push('Running in staging environment');
    }

    const responseTime = Date.now() - startTime;
    
    // Log health check for monitoring
    console.log(`🏥 Health check completed in ${responseTime}ms:`, {
      status: healthStatus.status,
      environment: config.environment,
      checks: Object.entries(healthStatus.checks).map(([name, check]) => 
        ({ name, status: check.status, responseTime: 'responseTime' in check ? check.responseTime : 0 })
      ),
      warningCount: healthStatus.warnings.length,
      errorCount: healthStatus.errors.length
    });

    // Set appropriate HTTP status code
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json({
      ...healthStatus,
      responseTime
    });

  } catch (error) {
    console.error('🏥 Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: config.environment,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    });
  }
}