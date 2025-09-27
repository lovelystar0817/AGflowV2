/**
 * Staging-specific routes and middleware
 * Includes testing endpoints and staging utilities
 */

import { type Express } from 'express';
import { healthCheck } from './health-check';
import { getStagingEmailService } from './email-service-staging';
import { getStagingAIService } from './ai-service-staging';
import { config } from './config';

export function registerStagingRoutes(app: Express) {
  // Only register staging routes in staging environment
  if (config.environment !== 'staging') {
    return;
  }

  console.log('🧪 Registering staging-specific routes...');

  // Health check endpoint
  app.get('/api/health', healthCheck);

  // Staging environment info
  app.get('/api/staging/info', (req, res) => {
    res.json({
      environment: 'staging',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      nodeEnv: process.env.NODE_ENV,
      domain: config.app.domain,
      emailDomain: config.app.emailDomain,
      features: {
        emailService: true,
        aiService: true,
        healthCheck: true
      }
    });
  });

  // Test email endpoint (staging only)
  app.post('/api/staging/test-email', async (req, res) => {
    try {
      const { to, type = 'welcome', clientName = 'Test User' } = req.body;
      
      if (!to) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      const emailService = getStagingEmailService();
      
      let result;
      if (type === 'welcome') {
        result = await emailService.sendWelcomeEmail(to, clientName);
      } else if (type === 'appointment') {
        result = await emailService.sendAppointmentReminder(to, {
          date: 'Tomorrow',
          time: '2:00 PM',
          service: 'Haircut & Style',
          stylistName: 'Test Stylist'
        });
      } else {
        result = await emailService.sendEmail({
          to,
          subject: 'Test Email from Staging',
          html: '<h2>Test Email</h2><p>This is a test email from the staging environment.</p>'
        });
      }

      res.json({
        success: true,
        message: 'Test email sent successfully',
        emailId: result.data?.id,
        type,
        to
      });
    } catch (error) {
      console.error('Staging test email failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test AI endpoint (staging only)
  app.post('/api/staging/test-ai', async (req, res) => {
    try {
      const { type = 'recommendations', clientInfo } = req.body;
      
      const aiService = getStagingAIService();
      
      let result;
      if (type === 'recommendations') {
        result = await aiService.generateStyleRecommendations(clientInfo || {
          faceShape: 'oval',
          hairType: 'wavy',
          lifestyle: 'active',
          preferences: 'low maintenance'
        });
      } else if (type === 'scheduling') {
        result = await aiService.generateSchedulingOptimization([
          { date: 'Today 10:00 AM', duration: 60, service: 'Cut & Color' },
          { date: 'Today 2:00 PM', duration: 45, service: 'Haircut' }
        ]);
      } else {
        return res.status(400).json({ error: 'Invalid test type' });
      }

      const usageStats = aiService.getUsageStats();

      res.json({
        success: true,
        result,
        usage: usageStats,
        type
      });
    } catch (error) {
      console.error('Staging AI test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Staging database test endpoint
  app.get('/api/staging/test-database', async (req, res) => {
    try {
      const { db } = await import('./db');
      
      // Simple database connectivity test
      const result = await db.execute('SELECT current_timestamp as timestamp, current_database() as database' as any);
      
      res.json({
        success: true,
        database: {
          connected: true,
          timestamp: result.rows[0]?.timestamp,
          database: result.rows[0]?.database
        },
        environment: config.environment
      });
    } catch (error) {
      console.error('Staging database test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Database connection failed'
      });
    }
  });

  // Reset staging data endpoint (careful!)
  app.post('/api/staging/reset-data', async (req, res) => {
    try {
      const { confirm } = req.body;
      
      if (confirm !== 'RESET_STAGING_DATA') {
        return res.status(400).json({
          error: 'Confirmation required. Send { "confirm": "RESET_STAGING_DATA" }'
        });
      }

      // This is a destructive operation - only allow in staging
      const { db } = await import('./db');
      
      // Add your data reset logic here
      // For safety, we'll just log the request for now
      console.warn('🗑️  STAGING DATA RESET REQUESTED (not implemented for safety)');
      
      res.json({
        success: true,
        message: 'Data reset logged (implementation pending)',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Staging data reset failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Reset failed'
      });
    }
  });

  console.log('✅ Staging routes registered successfully');
}