import { describe, it, expect, vi } from 'vitest';
import { getOptimizedAnalytics, batchQuery } from '../server/database-utils';

describe('Database Utils', () => {
  describe('getOptimizedAnalytics', () => {
    it('should return analytics data for weekly period', async () => {
      // Mock database response
      const mockResult = {
        rows: [
          {
            type: 'stats',
            data: { appointmentCount: 10, revenue: 500 }
          },
          {
            type: 'topServices',
            data: [
              { serviceName: 'Haircut', count: 5, revenue: 250 }
            ]
          },
          {
            type: 'busyDays',
            data: [
              { date: '2024-01-15', appointmentCount: 3 }
            ]
          },
          {
            type: 'loyalClients',
            data: [
              { clientId: 'client-1', fullName: 'John Doe', totalVisits: 5 }
            ]
          }
        ]
      };

      // Mock db.execute
      vi.mock('../server/db', () => ({
        db: {
          execute: vi.fn().mockResolvedValue(mockResult)
        }
      }));

      const result = await getOptimizedAnalytics('stylist-1', 'week');

      expect(result).toEqual({
        appointmentCount: 10,
        revenue: 500,
        topServices: [
          { serviceName: 'Haircut', count: 5, revenue: 250 }
        ],
        busyDays: [
          { date: '2024-01-15', appointmentCount: 3 }
        ],
        loyalClients: [
          { clientId: 'client-1', fullName: 'John Doe', totalVisits: 5 }
        ]
      });
    });
  });

  describe('batchQuery', () => {
    it('should execute queries in batches', async () => {
      const queries = [
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3),
        () => Promise.resolve(4),
        () => Promise.resolve(5)
      ];

      const result = await batchQuery(queries, 2);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });
});