import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

// Test database setup
beforeAll(async () => {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('Warning: DATABASE_URL should include "test" for testing');
  }
  
  // Run migrations if needed
  console.log('Setting up test database...');
});

afterAll(async () => {
  // Clean up after all tests
  console.log('Cleaning up test database...');
});

beforeEach(async () => {
  // Start a transaction before each test
  await db.execute(sql`BEGIN`);
});

afterEach(async () => {
  // Rollback transaction after each test
  await db.execute(sql`ROLLBACK`);
});

// Mock utilities for testing
export const mockStylist = {
  id: 'test-stylist-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'Stylist',
  businessName: 'Test Salon'
};

export const mockClient = {
  id: 'test-client-id',
  firstName: 'Test',
  lastName: 'Client',
  email: 'client@example.com',
  phone: '+1234567890',
  stylistId: 'test-stylist-id'
};

export const mockService = {
  id: 1,
  serviceName: 'Test Service',
  price: '50.00',
  isCustom: false,
  stylistId: 'test-stylist-id'
};

// Helper functions for test data creation
export async function createTestStylist(overrides: Partial<typeof mockStylist> = {}) {
  // Implementation would use the actual storage methods
  return { ...mockStylist, ...overrides };
}

export async function createTestClient(overrides: Partial<typeof mockClient> = {}) {
  return { ...mockClient, ...overrides };
}

export async function createTestService(overrides: Partial<typeof mockService> = {}) {
  return { ...mockService, ...overrides };
}