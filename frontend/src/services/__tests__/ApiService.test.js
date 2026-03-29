/**
 * ApiService Tests
 * 
 * Tests for enhanced API service with comprehensive error handling
 * Validates Requirements: 8.1, 8.4, 8.5
 */

import { jest } from '@jest/globals';
import ApiService from '../ApiService';

// Mock ErrorHandlingService
jest.mock('../ErrorHandlingService', () => ({
  default: {
    withRetry: jest.fn(),
    handleValidationErrors: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock navigator
global.navigator = {
  onLine: true
};

describe('ApiService', () => {
  
  beforeEach(() => {
    // Reset mocks
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Reset service state
    ApiService.requestQueue = [];
    ApiService.isOnline = true;
    
    // Mock console methods
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });
  
  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: {
          get: () => 'application/json'
        }
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      
      const result = await ApiService.request('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });
    
    it('should add authentication token when available', async () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: { get: () => 'application/json' }
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      
      await ApiService.request('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
    
    it('should add request ID for tracing', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: { get: () => 'application/json' }
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      
      await ApiService.request('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.stringMatching(/^req_\d+_[a-z0-9]+$/)
          })
        })
      );
    });
  });
  
  describe('HTTP method wrappers', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: { get: () => 'application/json' }
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
    });
    
    it('should make GET request', async () => {
      await ApiService.get('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });
    
    it('should make POST request with data', async () => {
      const testData = { name: 'test' };
      
      await ApiService.post('/test', testData);
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData)
        })
      );
    });
    
    it('should make PUT request with data', async () => {
      const testData = { id: 1, name: 'updated' };
      
      await ApiService.put('/test/1', testData);
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData)
        })
      );
    });
    
    it('should make DELETE request', async () => {
      await ApiService.delete('/test/1');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
  
  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      
      // Mock window.location
      delete window.location;
      window.location = { pathname: '/dashboard', href: '' };
      
      try {
        await ApiService.request('/test');
      } catch (error) {
        expect(error.status).toBe(401);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
        expect(window.location.href).toBe('/login');
      }
    });
    
    it('should handle 422 validation errors', async () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' }
      ];
      
      fetch.mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({
          message: 'Validation failed',
          errors: validationErrors
        })
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      ErrorHandlingService.handleValidationErrors.mockReturnValue({
        hasErrors: true,
        fieldErrors: { email: { message: 'Invalid email format' } }
      });
      
      try {
        await ApiService.request('/test');
      } catch (error) {
        expect(error.status).toBe(422);
        expect(error.validationErrors).toBeDefined();
        expect(ErrorHandlingService.handleValidationErrors).toHaveBeenCalledWith(validationErrors);
      }
    });
    
    it('should handle server errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal server error' })
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      
      try {
        await ApiService.request('/test');
      } catch (error) {
        expect(error.status).toBe(500);
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      }
    });
  });
  
  describe('offline handling', () => {
    it('should queue requests when offline', async () => {
      ApiService.isOnline = false;
      
      const requestPromise = ApiService.post('/test', { data: 'test' });
      
      expect(ApiService.requestQueue).toHaveLength(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Request queued (offline)')
      );
      
      // Don't await the promise as it won't resolve until online
    });
    
    it('should process queued requests when coming back online', async () => {
      // Setup offline state with queued request
      ApiService.isOnline = false;
      const requestPromise = ApiService.post('/test', { data: 'test' });
      
      expect(ApiService.requestQueue).toHaveLength(1);
      
      // Mock successful response for queued request
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: { get: () => 'application/json' }
      });
      
      // Come back online and process queue
      ApiService.isOnline = true;
      await ApiService._processQueuedRequests();
      
      expect(ApiService.requestQueue).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing 1 queued requests')
      );
    });
  });
  
  describe('file upload', () => {
    it('should upload file with FormData', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ fileId: 'uploaded-123' }),
        headers: { get: () => 'application/json' }
      });
      
      const ErrorHandlingService = require('../ErrorHandlingService').default;
      ErrorHandlingService.withRetry.mockImplementation(fn => fn());
      
      const result = await ApiService.uploadFile('/upload', mockFile);
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
      
      // Check that Content-Type header was not set (let browser set it for FormData)
      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBeUndefined();
      
      expect(result).toEqual({ fileId: 'uploaded-123' });
    });
  });
  
  describe('network status', () => {
    it('should return correct network status', () => {
      ApiService.isOnline = true;
      ApiService.requestQueue = [{ url: '/test1' }, { url: '/test2' }];
      
      const status = ApiService.getNetworkStatus();
      
      expect(status).toEqual({
        isOnline: true,
        queuedRequests: 2
      });
    });
    
    it('should clear request queue', () => {
      // Add some mock requests to queue
      ApiService.requestQueue = [
        { reject: jest.fn() },
        { reject: jest.fn() }
      ];
      
      ApiService.clearRequestQueue();
      
      expect(ApiService.requestQueue).toHaveLength(0);
      expect(ApiService.requestQueue[0]).toBeUndefined();
    });
  });
  
  describe('request ID generation', () => {
    it('should generate unique request IDs', () => {
      const id1 = ApiService._generateRequestId();
      const id2 = ApiService._generateRequestId();
      
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});