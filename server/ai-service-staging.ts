import OpenAI from 'openai';
import { config } from './config';

/**
 * Staging-specific AI service configuration
 * Uses staging API keys with rate limiting for testing
 */

export class StagingAIService {
  private openai: OpenAI;
  private requestCount: number = 0;
  private requestLimit: number = 100; // Staging limit per hour
  private lastResetTime: number = Date.now();

  constructor() {
    if (config.environment !== 'staging') {
      throw new Error('StagingAIService should only be used in staging environment');
    }

    this.openai = new OpenAI({
      apiKey: config.apis.openai,
    });

    console.log('🤖 Staging AI Service initialized with rate limiting');
  }

  /**
   * Rate limiting for staging environment
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const hoursSinceReset = (now - this.lastResetTime) / (1000 * 60 * 60);

    // Reset counter every hour
    if (hoursSinceReset >= 1) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.requestLimit) {
      throw new Error(`Staging AI rate limit exceeded. Max ${this.requestLimit} requests per hour.`);
    }

    this.requestCount++;
    console.log(`🤖 Staging AI request ${this.requestCount}/${this.requestLimit} for current hour`);
  }

  /**
   * Generate hair style recommendations (staging version)
   */
  async generateStyleRecommendations(clientInfo: {
    faceShape?: string;
    hairType?: string;
    lifestyle?: string;
    preferences?: string;
  }): Promise<string[]> {
    this.checkRateLimit();

    const prompt = `Based on the following client information, suggest 3 suitable hair styles:
    
Face Shape: ${clientInfo.faceShape || 'Not specified'}
Hair Type: ${clientInfo.hairType || 'Not specified'}
Lifestyle: ${clientInfo.lifestyle || 'Not specified'}
Preferences: ${clientInfo.preferences || 'Not specified'}

Please provide 3 specific, practical hair style recommendations with brief explanations.
Format as a simple list.

STAGING NOTE: This is a test request in staging environment.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional hair stylist providing style recommendations. Keep responses concise and practical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        user: 'staging-user'
      });

      const recommendations = response.choices[0]?.message?.content
        ?.split('\n')
        .filter(line => line.trim())
        .slice(0, 3) || [];

      console.log('🤖 Staging AI recommendations generated:', recommendations.length);
      
      return recommendations;
    } catch (error) {
      console.error('🤖 Staging AI request failed:', error);
      
      // Return fallback recommendations for staging
      return [
        '[STAGING] Classic Bob - A timeless cut that works for most face shapes',
        '[STAGING] Layered Cut - Adds volume and movement to your hair',
        '[STAGING] Long Layers - Perfect for maintaining length while adding style'
      ];
    }
  }

  /**
   * Generate appointment scheduling suggestions (staging version)
   */
  async generateSchedulingOptimization(appointments: Array<{
    date: string;
    duration: number;
    service: string;
  }>): Promise<{
    suggestions: string[];
    optimizations: string[];
  }> {
    this.checkRateLimit();

    const prompt = `Analyze the following appointment schedule and provide optimization suggestions:

Appointments:
${appointments.map(apt => `- ${apt.date}: ${apt.service} (${apt.duration} min)`).join('\n')}

Please provide:
1. Scheduling optimization suggestions
2. Time management recommendations

Keep it brief and practical.

STAGING NOTE: This is a test request in staging environment.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a salon scheduling optimizer. Provide practical scheduling advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.5,
        user: 'staging-scheduler'
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        suggestions: [content],
        optimizations: ['[STAGING] AI optimization recommendations generated']
      };
    } catch (error) {
      console.error('🤖 Staging AI scheduling request failed:', error);
      
      return {
        suggestions: ['[STAGING] Consider grouping similar services together'],
        optimizations: ['[STAGING] Allow buffer time between appointments']
      };
    }
  }

  /**
   * Get current usage statistics for staging monitoring
   */
  getUsageStats() {
    const hoursUntilReset = Math.max(0, 1 - (Date.now() - this.lastResetTime) / (1000 * 60 * 60));
    
    return {
      environment: 'staging',
      requestsUsed: this.requestCount,
      requestsRemaining: this.requestLimit - this.requestCount,
      hoursUntilReset: Math.round(hoursUntilReset * 100) / 100,
      rateLimitStatus: this.requestCount < this.requestLimit ? 'OK' : 'EXCEEDED'
    };
  }
}

// Export singleton instance for staging
let stagingAIService: StagingAIService | null = null;

export const getStagingAIService = (): StagingAIService => {
  if (!stagingAIService && config.environment === 'staging') {
    stagingAIService = new StagingAIService();
  }
  
  if (!stagingAIService) {
    throw new Error('Staging AI service not available in non-staging environment');
  }
  
  return stagingAIService;
};