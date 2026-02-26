/**
 * Vitest Setup File
 * Runs before all test files
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-not-production';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only';

// Mock Netlify Blobs in test environment
const mockBlobStore = new Map<string, any>();

export const mockGetStore = (storeName: string) => ({
  get: async (key: string) => {
    const storeKey = `${storeName}:${key}`;
    return mockBlobStore.get(storeKey);
  },
  set: async (key: string, value: any) => {
    const storeKey = `${storeName}:${key}`;
    mockBlobStore.set(storeKey, value);
  },
  delete: async (key: string) => {
    const storeKey = `${storeName}:${key}`;
    mockBlobStore.delete(storeKey);
  },
  list: async () => {
    const prefix = `${storeName}:`;
    const keys: string[] = [];
    for (const key of mockBlobStore.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.replace(prefix, ''));
      }
    }
    return { blobs: keys.map(key => ({ key })) };
  },
});

// Clear mock store after each test
afterEach(() => {
  mockBlobStore.clear();
});

// Global setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

// Global teardown
afterAll(() => {
  console.log('✅ Test suite completed');
});
